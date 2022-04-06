import WalletConnect from "@walletconnect/client";

import PeraWalletConnectError from "./util/PeraWalletConnectError";
import {
  openPeraWalletConnectModal,
  closePeraWalletConnectModal
} from "./modal/peraWalletConnectModalUtils";
import {
  resetWalletDetailsFromStorage,
  saveWalletDetailsToStorage
} from "./util/storage/storageUtils";
import {assignBridgeURL} from "./util/api/peraWalletConnectApi";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "./util/storage/storageConstants";

interface PeraWalletConnectOptions {
  bridge: string;
}

const peraWalletConnectModalActions = {
  open: openPeraWalletConnectModal,
  close: closePeraWalletConnectModal
};

(async function () {
  await assignBridgeURL();
})();

class PeraWalletConnect {
  bridge: string;
  connector: WalletConnect | null;

  constructor(options?: PeraWalletConnectOptions) {
    this.bridge =
      options?.bridge ||
      localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.BRIDGE_URL) ||
      "";

    this.connector = null;
  }

  connect() {
    return new Promise<string[]>(async (resolve, reject) => {
      try {
        // check if already connected and kill session first before creating a new one.
        // This is to kill the last session and make sure user start from scratch whenever `.connect()` method is called.
        if (this.connector?.connected) {
          await this.connector.killSession();
        }

        // Create Connector instance
        this.connector = new WalletConnect({
          bridge: this.bridge,
          qrcodeModal: peraWalletConnectModalActions
        });

        await this.connector.createSession({
          chainId: 4160
        });

        this.connector.on("connect", (error, _payload) => {
          if (error) {
            reject(error);
          }

          resolve(this.connector?.accounts || []);

          saveWalletDetailsToStorage(this.connector?.accounts || []);
        });
      } catch (error: any) {
        console.log(error);

        reject(
          new PeraWalletConnectError(
            {
              type: "SESSION_CONNECT",
              detail: error
            },
            error.message || "There was an error while connecting to Pera Wallet"
          )
        );
      }
    });
  }

  reconnectSession() {
    return new Promise<string[]>((resolve, reject) => {
      try {
        if (!this.connector && this.bridge) {
          this.connector = new WalletConnect({
            bridge: this.bridge,
            qrcodeModal: peraWalletConnectModalActions
          });

          resolve(this.connector?.accounts || []);
        } else {
          resolve([]);
        }
      } catch (error: any) {
        reject(
          new PeraWalletConnectError(
            {
              type: "SESSION_RECONNECT",
              detail: error
            },
            error.message || "There was an error while reconnecting to Pera Wallet"
          )
        );
      }
    });
  }

  disconnect() {
    const killPromise = this.connector?.killSession();

    killPromise?.then(() => {
      this.connector = null;
    });

    resetWalletDetailsFromStorage();

    return killPromise;
  }
}

export default PeraWalletConnect;
