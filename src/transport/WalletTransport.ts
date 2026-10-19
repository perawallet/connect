import {
    type AlgorandChainIDs,
    type PeraWalletPlatformType,
} from '../util/peraWalletTypes.js'
import {
    type PeraWalletArbitraryData,
    type PeraWalletArc60SignData,
    type PeraWalletArc60SignDataResponse,
    type PeraWalletTransaction,
    type SignMetadata,
} from '../util/model/peraWalletModels.js'

export type ConnectOptions = { selectedAccount?: string }

// Session lifecycle is deliberately not here: only ExtensionTransport owns a
// persistent session with its counterparty; PeraWalletConnect drives Mobile's
// WalletConnect session and Web's inline connect flow directly.
export interface WalletTransport {
    readonly platform: PeraWalletPlatformType
    signTransaction(
        txns: PeraWalletTransaction[],
        signerAddress?: string,
    ): Promise<Uint8Array[]>
    signData(
        data: PeraWalletArbitraryData[],
        signer: string,
        chainId: AlgorandChainIDs,
    ): Promise<Uint8Array[]>
    signArc60Data(
        payload: PeraWalletArc60SignData,
        metadata: SignMetadata,
    ): Promise<PeraWalletArc60SignDataResponse>
}
