import {Buffer} from 'buffer';

if (typeof window !== "undefined") {
  // Pollyfill for Buffer
  (window as any).global = window;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  window.Buffer = window.Buffer || Buffer;

  import("./App");
}


import PeraWalletConnect from "./PeraWalletConnect";
import {closePeraWalletSignTxnToast} from "./modal/peraWalletConnectModalUtils";

export {PeraWalletConnect, closePeraWalletSignTxnToast};
