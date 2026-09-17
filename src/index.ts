import {Buffer} from "buffer";

if (typeof window !== "undefined") {
  // Pollyfill for Buffer
  (window as any).global = window;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (window as any).Buffer = (window as any).Buffer || Buffer;

  import("./App");
}

import PeraWalletConnect from "./PeraWalletConnect";
import {closePeraWalletSignTxnToast} from "./modal/peraWalletConnectModalUtils";

export {PeraWalletConnect, closePeraWalletSignTxnToast};
export {
  ScopeType,
  type PeraWalletArbitraryData,
  type PeraWalletArc60SignData,
  type PeraWalletArc60SignDataResponse,
  type PeraWalletArc60SignerResolution,
  type PeraWalletAlgodClients,
  type PeraWalletNetwork,
  type PeraWalletMultisigMetadata,
  type PeraWalletTransaction,
  type SignerTransaction,
  type SignMetadata,
  type Siwa
} from "./util/model/peraWalletModels";
export {
  PERA_PROVIDER_ERROR_CODES,
  getPeraProvider,
  isPeraProviderError,
  type PeraAccount,
  type PeraNetwork,
  type PeraProvider,
  type PeraProviderConnectOptions,
  type PeraProviderConnectResult,
  type PeraProviderError,
  type PeraProviderEvent,
  type PeraProviderWalletTransaction
} from "./transport/extension/peraProviderTypes";
