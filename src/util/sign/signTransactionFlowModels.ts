import {
    type PeraWalletArbitraryData,
    type PeraWalletTransaction,
} from '../model/peraWalletModels'
import { type PeraTeller } from '../network/teller/appTellerManager'
import { type AlgorandChainIDs } from '../peraWalletTypes'

type SignTransactionFlowMethod = 'SIGN_TXN' | 'SIGN_DATA'

interface SignTransactionFlowPromise {
    resolve: (value: Uint8Array[] | PromiseLike<Uint8Array[]>) => void
    reject: (error: unknown) => void

    signer?: string
    chainId?: AlgorandChainIDs
}

interface RunSignTransactionFlowParams extends SignTransactionFlowPromise {
    method: SignTransactionFlowMethod
    signTxnRequestParams: PeraWalletTransaction[] | PeraWalletArbitraryData[]
    webWalletURL: string
    isCompactMode?: boolean
}

interface NewTabSignTransactionFlowTellerReducerParams extends SignTransactionFlowPromise {
    event: MessageEvent<TellerMessage<PeraTeller>>
    newPeraWalletTab: Window | null
    method: SignTransactionFlowMethod
}

export type {
    SignTransactionFlowPromise,
    RunSignTransactionFlowParams,
    NewTabSignTransactionFlowTellerReducerParams,
}
