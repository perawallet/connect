import algosdk from 'algosdk'

import {
    type FakeWalletConnect,
    type RelayedRequest,
    walletConnectRelay,
} from './fakeWalletConnect.js'
import { waitFor } from './flush.js'
import {
    buildEmptySignature,
    senderOf,
    signArc60,
    signWalletTransaction,
} from './walletCrypto.js'

interface WalletTransactionParams {
    txn: string
    signers?: string[]
}

interface ArbitraryDataParams {
    data: string
    signer: string
}

interface Arc60Params {
    data: string
    signer: string
    authenticatorData: string
}

let peerCount = 0

/**
 * The Pera mobile app on the other end of the WalletConnect bridge. It holds
 * real algosdk keys: pairing approves its addresses, and signing requests are
 * answered with genuine signatures unless a test overrides the answer.
 */
export class FakePeraMobile {
    readonly accounts: algosdk.Account[]
    readonly peerId: string
    /** account address → address whose key signs for it (a rekey). */
    private readonly authAccounts = new Map<string, string>()

    constructor(accountCount = 1) {
        peerCount += 1
        this.peerId = `pera-mobile-${peerCount}`
        this.accounts = Array.from({ length: accountCount }, () =>
            algosdk.generateAccount(),
        )
    }

    get addresses(): string[] {
        return this.accounts.map(account => account.addr.toString())
    }

    /** The user scans the QR code (or follows the deep link) and approves. */
    scanQrCode(uri: string, accounts = this.addresses) {
        this.requireConnector(uri).approveSession({
            accounts,
            peerId: this.peerId,
        })
    }

    declinePairing(uri: string) {
        this.requireConnector(uri).rejectSession()
    }

    /** The user ends the session from Pera's side (e.g. disconnects the dApp). */
    endSession() {
        walletConnectRelay.connectors
            .filter(
                connector =>
                    connector.connected && connector.peerId === this.peerId,
            )
            .forEach(connector => connector.endSessionFromWallet())
    }

    /** Signs for `address` with `authAddress`'s key, as after a rekey. */
    rekey(address: string, authAddress: string) {
        this.authAccounts.set(address, authAddress)
    }

    /** Resolves once a request from the dApp is waiting in Pera. */
    async waitForRequest(): Promise<RelayedRequest> {
        await waitFor(() => walletConnectRelay.requests.length > 0)

        return walletConnectRelay.requests[0]
    }

    /** The user approves the oldest pending request in Pera. */
    async approveNextRequest(
        transformResult?: (result: unknown) => unknown,
    ): Promise<RelayedRequest> {
        const relayed = await this.takeNextRequest()
        const result = await this.answer(relayed.request)

        relayed.resolve(transformResult ? transformResult(result) : result)

        return relayed
    }

    async rejectNextRequest(error: Error): Promise<RelayedRequest> {
        const relayed = await this.takeNextRequest()

        relayed.reject(error)

        return relayed
    }

    private async takeNextRequest() {
        await this.waitForRequest()

        return walletConnectRelay.requests.shift()!
    }

    private async answer(request: RelayedRequest['request']) {
        switch (request.method) {
            case 'algo_signTxn': {
                const [txns] = request.params as [WalletTransactionParams[]]

                return txns.map(walletTxn =>
                    walletTxn.signers?.length === 0
                        ? null
                        : signWalletTransaction(
                              walletTxn.txn,
                              this.secretKeyFor(senderOf(walletTxn.txn)),
                          ),
                )
            }
            case 'algo_signData': {
                if (Array.isArray(request.params)) {
                    return (request.params as ArbitraryDataParams[]).map(item =>
                        algosdk.bytesToBase64(
                            algosdk.signBytes(
                                algosdk.base64ToBytes(item.data),
                                this.secretKeyFor(item.signer),
                            ),
                        ),
                    )
                }

                const arc60 = request.params as Arc60Params
                const signature = await signArc60(
                    algosdk.base64ToBytes(arc60.data),
                    algosdk.base64ToBytes(arc60.authenticatorData),
                    this.secretKeyFor(arc60.signer),
                )

                return [algosdk.bytesToBase64(signature)]
            }
            case 'algo_getEmptySignatures': {
                return Object.fromEntries(
                    this.addresses.map(address => [
                        address,
                        buildEmptySignature(),
                    ]),
                )
            }
            default: {
                throw new Error(`Pera does not know ${request.method}`)
            }
        }
    }

    private secretKeyFor(address: string) {
        const keyAddress = this.authAccounts.get(address) ?? address
        const account = this.accounts.find(
            item => item.addr.toString() === keyAddress,
        )

        if (!account) {
            throw new Error(`Pera holds no key for ${address}`)
        }

        return account.sk
    }

    private requireConnector(uri: string): FakeWalletConnect {
        const connector = walletConnectRelay.findByUri(uri)

        if (!connector) {
            throw new Error(`No dApp published the pairing URI ${uri}`)
        }

        return connector
    }
}
