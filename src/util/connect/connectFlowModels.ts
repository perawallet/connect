import { type PeraTeller } from '../network/teller/appTellerManager.js'
import { type AlgorandChainIDs } from '../peraWalletTypes.js'

interface ConnectFlowPromise {
    resolve: (accounts: string[]) => void
    reject: (reason?: unknown) => void
    /**
     * Whether the connect() call already settled another way (the modal was
     * closed, another option connected). Pera Web's late answer is then
     * dropped instead of stored.
     */
    isSettled?: () => boolean
}

interface RunWebConnectFlowTypes extends ConnectFlowPromise {
    webWalletURL: string
    chainId: AlgorandChainIDs | undefined
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
