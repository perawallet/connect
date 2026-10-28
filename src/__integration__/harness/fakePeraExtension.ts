import algosdk from 'algosdk'
import { vi } from 'vitest'

import {
    PERA_PROVIDER_ERROR_CODES,
    type PeraNetwork,
    type PeraProvider,
    type PeraProviderConnectOptions,
    type PeraProviderConnectResult,
    type PeraProviderEvent,
    type PeraProviderWalletTransaction,
} from '../../index.js'
import { hasTransientUserActivation } from './userActivation.js'
import {
    buildEmptySignature,
    senderOf,
    signArc60,
    signWalletTransaction,
} from './walletCrypto.js'

type Handler = (params: unknown) => void

interface FakePeraExtensionOptions {
    accountCount?: number
    network?: PeraNetwork
    /** Extensions released before `getEmptySignatures` lack the method. */
    supportsEmptySignatures?: boolean
}

function providerError(code: number, message: string) {
    const error = new Error(message) as Error & { code: number }

    error.name = 'PeraProviderError'
    error.code = code

    return error
}

/**
 * The provider the Pera browser extension injects at `window.pera`. Like the
 * real one, a first-time `connect()` only succeeds with transient user
 * activation (see `clickAsUser`), and an origin it has approved reconnects
 * without one. Signing uses real keys.
 */
export class FakePeraExtension implements PeraProvider {
    readonly version = '1' as const
    readonly accounts: algosdk.Account[]
    network: PeraNetwork
    isOriginApproved = false
    /** What the user does in the extension's approval window. */
    connectDecision: 'approve' | 'reject' = 'approve'

    readonly connect = vi.fn(
        (
            options?: PeraProviderConnectOptions,
        ): Promise<PeraProviderConnectResult> => this.handleConnect(options),
    )
    readonly disconnect = vi.fn(async () => {
        this.isOriginApproved = false
    })
    readonly getAddresses = vi.fn(async () =>
        this.isOriginApproved ? this.peraAccounts() : [],
    )
    readonly signTransactions = vi.fn(
        async (txns: PeraProviderWalletTransaction[]) => {
            this.assertApproved()

            return txns.map(walletTxn =>
                walletTxn.signers?.length === 0
                    ? null
                    : signWalletTransaction(
                          walletTxn.txn,
                          this.secretKeyFor(senderOf(walletTxn.txn)),
                      ),
            )
        },
    )
    readonly signData = vi.fn(async (payload: unknown) => {
        this.assertApproved()

        return this.sign(payload)
    })
    readonly getEmptySignatures?: (options?: {
        network?: PeraNetwork
    }) => Promise<Record<string, string>>

    private handlers = new Map<PeraProviderEvent, Set<Handler>>()

    constructor({
        accountCount = 1,
        network = 'testnet',
        supportsEmptySignatures = true,
    }: FakePeraExtensionOptions = {}) {
        this.network = network
        this.accounts = Array.from({ length: accountCount }, () =>
            algosdk.generateAccount(),
        )

        if (supportsEmptySignatures) {
            this.getEmptySignatures = vi.fn(async options => {
                this.assertApproved()

                if (options?.network && options.network !== this.network) {
                    throw providerError(
                        PERA_PROVIDER_ERROR_CODES.NETWORK_NOT_SUPPORTED,
                        `Pera is on ${this.network}`,
                    )
                }

                return Object.fromEntries(
                    this.addresses.map(address => [
                        address,
                        buildEmptySignature(),
                    ]),
                )
            })
        }
    }

    get addresses(): string[] {
        return this.accounts.map(account => account.addr.toString())
    }

    on(event: PeraProviderEvent, handler: Handler): () => void {
        const handlers = this.handlers.get(event) ?? new Set<Handler>()

        handlers.add(handler)
        this.handlers.set(event, handlers)

        return () => handlers.delete(handler)
    }

    /** Puts the provider on the page, as the extension does before any script. */
    install() {
        Object.defineProperty(window, 'pera', {
            value: this,
            configurable: true,
            writable: true,
        })

        return this
    }

    /** The user removes this site from the extension's Connections screen. */
    revokeOrigin() {
        this.isOriginApproved = false
        this.emit('disconnect', undefined)
    }

    switchNetwork(network: PeraNetwork) {
        this.network = network
        this.emit('networkChanged', { network })
    }

    listenerCount(event: PeraProviderEvent) {
        return this.handlers.get(event)?.size ?? 0
    }

    private emit(event: PeraProviderEvent, params: unknown) {
        this.handlers.get(event)?.forEach(handler => handler(params))
    }

    private handleConnect(
        options?: PeraProviderConnectOptions,
    ): Promise<PeraProviderConnectResult> {
        if (!this.isOriginApproved) {
            if (!hasTransientUserActivation()) {
                return Promise.reject(
                    providerError(
                        PERA_PROVIDER_ERROR_CODES.UNAUTHORIZED,
                        'connect() needs a user gesture',
                    ),
                )
            }

            if (this.connectDecision === 'reject') {
                return Promise.reject(
                    providerError(
                        PERA_PROVIDER_ERROR_CODES.USER_REJECTED,
                        'The user rejected the request',
                    ),
                )
            }
        }

        if (options?.network && options.network !== this.network) {
            return Promise.reject(
                providerError(
                    PERA_PROVIDER_ERROR_CODES.NETWORK_NOT_SUPPORTED,
                    `Pera is on ${this.network}`,
                ),
            )
        }

        this.isOriginApproved = true

        return Promise.resolve({
            accounts: this.peraAccounts(),
            network: this.network,
        })
    }

    private async sign(payload: unknown): Promise<string[]> {
        const { data } = payload as { data: unknown }

        if (Array.isArray(data)) {
            return (data as { signer: string; data: string }[]).map(item =>
                algosdk.bytesToBase64(
                    algosdk.signBytes(
                        algosdk.base64ToBytes(item.data),
                        this.secretKeyFor(item.signer),
                    ),
                ),
            )
        }

        const arc60 = payload as {
            data: string
            signer: string
            authenticatorData: string
        }
        const signature = await signArc60(
            algosdk.base64ToBytes(arc60.data),
            algosdk.base64ToBytes(arc60.authenticatorData),
            this.secretKeyFor(arc60.signer),
        )

        return [algosdk.bytesToBase64(signature)]
    }

    private peraAccounts() {
        return this.addresses.map((address, index) => ({
            address,
            name: `Account ${index + 1}`,
        }))
    }

    private assertApproved() {
        if (!this.isOriginApproved) {
            throw providerError(
                PERA_PROVIDER_ERROR_CODES.UNAUTHORIZED,
                'This site is not connected',
            )
        }
    }

    private secretKeyFor(address: string) {
        const account = this.accounts.find(
            item => item.addr.toString() === address,
        )

        if (!account) {
            throw providerError(
                PERA_PROVIDER_ERROR_CODES.INVALID_PARAMS,
                `No account ${address}`,
            )
        }

        return account.sk
    }
}

export function uninstallPeraExtension() {
    delete window.pera
}
