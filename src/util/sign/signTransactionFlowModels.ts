import PeraWalletConnectError from "../PeraWalletConnectError";
import {PeraWalletArbitraryData, PeraWalletTransaction} from "../model/peraWalletModels";
import {PeraTeller} from "../network/teller/appTellerManager";
import {AlgorandChainIDs} from "../peraWalletTypes";

type SignTransactionFlowMethod = "SIGN_TXN" | "SIGN_DATA";

interface SignTransactionFlowPromise {
  resolve: (value: Uint8Array[] | PromiseLike<Uint8Array[]>) => void;
  reject: (error: PeraWalletConnectError) => void;

  signer?: string;
  chainId?: AlgorandChainIDs;
}

interface RunSignTransactionFlowParams extends SignTransactionFlowPromise {
  method: SignTransactionFlowMethod;
  signTxnRequestParams: PeraWalletTransaction[] | PeraWalletArbitraryData[];
  webWalletURL: string;
  isCompactMode?: boolean;
}

interface NewTabSignTransactionFlowTellerReducerParams
  extends SignTransactionFlowPromise {
  event: MessageEvent<TellerMessage<PeraTeller>>;
  newPeraWalletTab: Window | null;
  method: SignTransactionFlowMethod;
}

export type {
  SignTransactionFlowPromise,
  RunSignTransactionFlowParams,
  NewTabSignTransactionFlowTellerReducerParams
};
