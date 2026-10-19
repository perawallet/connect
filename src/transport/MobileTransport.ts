import type WalletConnect from '@perawallet/walletconnect'
import algosdk from 'algosdk'

import { type WalletTransport } from './WalletTransport.js'
import {
    buildArc60WireParams,
    buildArc60SignDataResponse,
} from './arc60Wire.js'
import { PeraWalletConnectError } from '../util/PeraWalletConnectError.js'
import {
    type PeraWalletArbitraryData,
    type PeraWalletArc60SignData,
    type PeraWalletArc60SignDataResponse,
    type SignMetadata,
    type PeraWalletTransaction,
} from '../util/model/peraWalletModels.js'
import { type AlgorandChainIDs } from '../util/peraWalletTypes.js'
import {
    base64ToUint8Array,
    formatJsonRpcRequest,
} from '../util/transaction/transactionUtils.js'
import {
    EMPTY_SIGNATURES_METHOD,
    EMPTY_SIGNATURES_TIMEOUT_MS,
    withTimeout,
} from '../util/emptySignatures.js'
import {
    removeModalWrapperFromDOM,
    PERA_WALLET_REDIRECT_MODAL_ID,
    PERA_WALLET_SIGN_TXN_TOAST_ID,
    openPeraWalletRedirectModal,
    openPeraWalletSignTxnToast,
} from '../modal/peraWalletConnectModalUtils.js'
import { isMobile } from '../util/device/deviceUtils.js'
import { getErrorMessage } from '../util/error/errorUtils.js'

// Only the request method is needed, which keeps test doubles small.
type Connector = Pick<WalletConnect, 'sendCustomRequest'>

// WalletConnect v1 types `params` as an array, but Pera's wallet also takes a
// single object (ARC-60 signing, empty signatures).
type ConnectorRequest = Parameters<Connector['sendCustomRequest']>[0]

export interface MobileTransportDeps {
    connector: Connector | null
    shouldShowSignTxnToast: boolean
    isInWebview: boolean
    getSilent: () => Promise<boolean>
}

type WalletSignatures = (string | number[] | null)[]

function decodeSignature(signature: string | number[]) {
    return typeof signature === 'string'
        ? base64ToUint8Array(signature)
        : Uint8Array.from(signature)
}

/**
 * Asks the wallet for its accounts' empty signatures. This is a function rather
 * than a MobileTransport method because the wallet answers without prompting:
 * the class's constructor opens the signing toast or redirect modal, and this
 * request must show nothing, send no push notification and open no deep link.
 * Pera apps that don't know the method drop it silently, so the timeout is the
 * only way out.
 */
export function requestEmptySignatures(
    connector: Connector,
    caipChainId: string,
): Promise<unknown> {
    const request = formatJsonRpcRequest(EMPTY_SIGNATURES_METHOD, {
        chainId: caipChainId,
    })

    return withTimeout(
        // WalletConnect v1 throws synchronously when the session is gone.
        Promise.resolve().then(() =>
            connector.sendCustomRequest(
                request as unknown as ConnectorRequest,
                {
                    forcePushNotification: false,
                },
            ),
        ),
        EMPTY_SIGNATURES_TIMEOUT_MS,
        () =>
            new PeraWalletConnectError(
                { type: 'EMPTY_SIGNATURES_TIMEOUT' },
                `Pera didn't answer ${EMPTY_SIGNATURES_METHOD} within ${EMPTY_SIGNATURES_TIMEOUT_MS} ms. Its accounts' types stay unknown.`,
            ),
    ).catch((error: unknown) => {
        if (error instanceof PeraWalletConnectError) {
            throw error
        }

        throw new PeraWalletConnectError(
            {
                type: 'EMPTY_SIGNATURES',
                detail: { reason: 'wallet-error', error },
            },
            getErrorMessage(
                error,
                `Pera couldn't answer ${EMPTY_SIGNATURES_METHOD}.`,
            ),
        )
    })
}

export class MobileTransport implements WalletTransport {
    readonly platform = 'mobile' as const
    private deps: MobileTransportDeps

    constructor(deps: MobileTransportDeps) {
        this.deps = deps

        if (isMobile() && !deps.isInWebview) {
            // Opens the wallet app so the user lands on the signing request.
            openPeraWalletRedirectModal()
        } else if (!isMobile() && deps.shouldShowSignTxnToast) {
            // Tells a desktop user to look at their phone.
            openPeraWalletSignTxnToast()
        }
    }

    async signTransaction(
        signTxnRequestParams: PeraWalletTransaction[],
    ): Promise<Uint8Array[]> {
        const connector = this.requireConnector()

        try {
            const response = (await this.send(
                connector,
                formatJsonRpcRequest('algo_signTxn', [signTxnRequestParams]),
            )) as WalletSignatures

            // Transactions the wallet was told not to sign come back empty.
            return response
                .filter((signature): signature is string | number[] =>
                    Boolean(signature),
                )
                .map(decodeSignature)
        } catch (error) {
            throw new PeraWalletConnectError(
                { type: 'SIGN_TRANSACTIONS', detail: error },
                getErrorMessage(error, 'Failed to sign transaction'),
            )
        }
    }

    async signData(
        data: PeraWalletArbitraryData[],
        signer: string,
        chainId: AlgorandChainIDs,
    ): Promise<Uint8Array[]> {
        const connector = this.requireConnector()
        const request = formatJsonRpcRequest(
            'algo_signData',
            data.map(item => ({
                data: algosdk.bytesToBase64(item.data),
                message: item.message,
                signer,
                chainId,
            })),
        )

        try {
            const response = (await this.send(connector, request)) as (
                | string
                | number[]
            )[]

            return response.map(decodeSignature)
        } catch (error) {
            throw new PeraWalletConnectError(
                { type: 'SIGN_DATA', detail: error },
                getErrorMessage(error, 'Failed to sign data'),
            )
        }
    }

    async signArc60Data(
        payload: PeraWalletArc60SignData,
        metadata: SignMetadata,
    ): Promise<PeraWalletArc60SignDataResponse> {
        const connector = this.requireConnector()
        const request = formatJsonRpcRequest(
            'algo_signData',
            buildArc60WireParams(payload, metadata),
        )

        try {
            const response = await this.send(connector, request)
            const [signature] = (
                Array.isArray(response) ? response : [response]
            ).filter(Boolean) as (string | number[])[]

            if (!signature) {
                throw new Error('No signature returned from wallet.')
            }

            return buildArc60SignDataResponse(
                payload,
                decodeSignature(signature),
            )
        } catch (error) {
            throw new PeraWalletConnectError(
                { type: 'SIGN_DATA', detail: error },
                getErrorMessage(error, 'Failed to sign ARC-60 data'),
            )
        }
    }

    private requireConnector() {
        if (!this.deps.connector) {
            throw new Error('PeraWalletConnect was not initialized correctly.')
        }

        return this.deps.connector
    }

    // The redirect modal and signing toast opened by the constructor stay up
    // until the wallet answers, whatever the answer is.
    private async send(
        connector: Connector,
        request: ReturnType<typeof formatJsonRpcRequest>,
    ) {
        try {
            const silent = await this.deps.getSilent()

            return (await connector.sendCustomRequest(
                request as ConnectorRequest,
                { forcePushNotification: !silent },
            )) as unknown
        } finally {
            removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID)
            removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID)
        }
    }
}
