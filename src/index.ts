if (typeof window !== "undefined") {
  // Pollyfill for Buffer
  (window as any).global = window;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  window.Buffer = window.Buffer || require("buffer").Buffer;
}

// Components
import PeraWalletConnect from "./PeraWalletConnect";
// Utilities
import {closePeraWalletSignTxnToast} from "./modal/peraWalletConnectModalUtils";

export {PeraWalletConnect, closePeraWalletSignTxnToast};
