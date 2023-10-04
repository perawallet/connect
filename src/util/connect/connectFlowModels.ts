import {PeraTeller} from "../network/teller/appTellerManager";
import {PeraWebWalletURLs} from "../peraWalletConstants";
import {AlgorandChainIDs} from "../peraWalletTypes";

interface ConnectFlowPromise {
  resolve: (accounts: string[]) => void;
  reject: (reason?: any) => void;
}

interface RunWebConnectFlowTypes extends ConnectFlowPromise {
  webWalletURL: string;
  chainId: AlgorandChainIDs | undefined;
  isCompactMode?: boolean;
}

interface EmbeddedConnectFlowTellerReducerParams extends ConnectFlowPromise {
  event: MessageEvent<TellerMessage<PeraTeller>>;
  peraWalletIframe: HTMLIFrameElement;
  chainId: AlgorandChainIDs | undefined;
  isIframeInitializedChecker: NodeJS.Timer;
  webWalletURLs: PeraWebWalletURLs;
}

interface NewTabConnectFlowTellerReducerParams extends ConnectFlowPromise {
  event: MessageEvent<TellerMessage<PeraTeller>>;
  newPeraWalletTab: Window | null;
}

export type {
  ConnectFlowPromise,
  RunWebConnectFlowTypes,
  EmbeddedConnectFlowTellerReducerParams,
  NewTabConnectFlowTellerReducerParams
};
