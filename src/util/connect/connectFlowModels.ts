import {PeraTeller} from "../network/teller/appTellerManager";
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

interface NewTabConnectFlowTellerReducerParams extends ConnectFlowPromise {
  event: MessageEvent<TellerMessage<PeraTeller>>;
  newPeraWalletTab: Window | null;
}

export type {
  ConnectFlowPromise,
  RunWebConnectFlowTypes,
  NewTabConnectFlowTellerReducerParams
};
