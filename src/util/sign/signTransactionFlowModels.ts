import PeraWalletConnectError from "../PeraWalletConnectError";
import {PeraWalletArbitraryData, PeraWalletTransaction} from "../model/peraWalletModels";
import {PeraTeller} from "../network/teller/appTellerManager";
import {PeraWebWalletURLs} from "../peraWalletConstants";

type SignTransactionFlowMethod = "SIGN_TXN" | "SIGN_DATA";

interface SignTransactionFlowPromise {
  resolve: (value: Uint8Array[] | PromiseLike<Uint8Array[]>) => void;
  reject: (error: PeraWalletConnectError) => void;
}

interface RunSignTransactionFlowParams extends SignTransactionFlowPromise {
  signTxnRequestParams: PeraWalletTransaction[] | PeraWalletArbitraryData[];
  webWalletURL: string;
  method: SignTransactionFlowMethod;
}

interface EmbeddedSignTransactionFlowTellerReducerParams
  extends SignTransactionFlowPromise {
  event: MessageEvent<TellerMessage<PeraTeller>>;
  signTxnRequestParams: PeraWalletTransaction[] | PeraWalletArbitraryData[];
  peraWalletIframe: HTMLIFrameElement;
  isIframeInitializedChecker: NodeJS.Timer;
  method: SignTransactionFlowMethod;
  webWalletURLs: PeraWebWalletURLs;
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
  EmbeddedSignTransactionFlowTellerReducerParams,
  NewTabSignTransactionFlowTellerReducerParams
};
