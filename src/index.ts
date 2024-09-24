if (typeof window !== "undefined") {
  // Pollyfill for Buffer
  (window as any).global = window;
  (async () => {
    if (!window.Buffer) {
      const {Buffer} = await import('buffer');

      window.Buffer = Buffer;
    }
  })();

  import("./App");
}

import PeraWalletConnect from "./PeraWalletConnect";
import {closePeraWalletSignTxnToast} from "./modal/peraWalletConnectModalUtils";

export {PeraWalletConnect, closePeraWalletSignTxnToast};
