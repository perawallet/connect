import { type PeraTeller } from '../network/teller/appTellerManager.js'
import { type AlgorandChainIDs } from '../peraWalletTypes.js'

interface ConnectFlowPromise {
    resolve: (accounts: string[]) => void
    reject: (reason?: unknown) => void
}

interface RunWebConnectFlowTypes extends ConnectFlowPromise {
    webWalletURL: string
    chainId: AlgorandChainIDs | undefined
    isCompactMode?: boolean
}

interface NewTabConnectFlowTellerReducerParams extends ConnectFlowPromise {
    event: MessageEvent<TellerMessage<PeraTeller>>
    newPeraWalletTab: Window | null
}

export type {
    ConnectFlowPromise,
    RunWebConnectFlowTypes,
    NewTabConnectFlowTellerReducerParams,
}
