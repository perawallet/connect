import WalletConnect from "@walletconnect/client";
import {formatJsonRpcRequest} from "@json-rpc-tools/utils/dist/cjs/format";

import PeraWalletConnectError from "./util/PeraWalletConnectError";
import {
  openPeraWalletConnectModal,
  openPeraWalletRedirectModal,
  removeModalWrapperFromDOM,
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_REDIRECT_MODAL_ID
} from "./modal/peraWalletConnectModalUtils";
import {
  resetWalletDetailsFromStorage,
  saveWalletDetailsToStorage
} from "./util/storage/storageUtils";
import {assignBridgeURL, listBridgeServers} from "./util/api/peraWalletConnectApi";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "./util/storage/storageConstants";
import {PeraWalletTransaction, SignerTransaction} from "./util/model/peraWalletModels";
import {
  base64ToUint8Array,
  encodeUnsignedTransactionInBase64
} from "./util/transaction/transactionUtils";
import {isMobile} from "./util/device/deviceUtils";
import {AppMeta} from "./util/peraWalletTypes";
import {getPeraWalletAppMeta} from "./util/peraWalletUtils";

interface PeraWalletConnectOptions {
  bridge?: string;
  deep_link?: string;
  app_meta?: AppMeta;
}

const peraWalletConnectModalActions = {
  open: openPeraWalletConnectModal,
  close: () => removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID)
};

class PeraWalletConnect {
  bridge: string;
  connector: WalletConnect | null;

  constructor(options?: PeraWalletConnectOptions) {
    this.bridge =
      options?.bridge ||
      localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.BRIDGE_URL) ||
      "";

    if (options?.deep_link) {
      localStorage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.DEEP_LINK, options.deep_link);
    }

    if (options?.app_meta) {
      localStorage.setItem(
        PERA_WALLET_LOCAL_STORAGE_KEYS.APP_META,
        JSON.stringify(options.app_meta)
      );
    }

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

        let bridgeURL = "";

        if (!this.bridge) {
          bridgeURL = await assignBridgeURL();
        }

        // Create Connector instance
        this.connector = new WalletConnect({
          bridge: this.bridge || bridgeURL,
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

        const {name} = getPeraWalletAppMeta();

        reject(
          new PeraWalletConnectError(
            {
              type: "SESSION_CONNECT",
              detail: error
            },
            error.message || `There was an error while connecting to ${name}`
          )
        );
      }
    });
  }

  async reconnectSession() {
    try {
      if (this.connector) {
        return this.connector.accounts || [];
      }

      // Fetch the active bridge servers
      const response = await listBridgeServers();

      if (response.servers.includes(this.bridge)) {
        this.connector = new WalletConnect({
          bridge: this.bridge,
          qrcodeModal: peraWalletConnectModalActions
        });

        return this.connector?.accounts || [];
      }

      throw new PeraWalletConnectError(
        {
          type: "SESSION_RECONNECT",
          detail: ""
        },
        "The bridge server is not active anymore. Disconnecting."
      );
    } catch (error: any) {
      // If the bridge is not active, then disconnect
      this.disconnect();

      const {name} = getPeraWalletAppMeta();

      throw new PeraWalletConnectError(
        {
          type: "SESSION_RECONNECT",
          detail: error
        },
        error.message || `There was an error while reconnecting to ${name}`
      );
    }
  }

  disconnect() {
    const killPromise = this.connector?.killSession();

    killPromise?.then(() => {
      this.connector = null;
    });

    resetWalletDetailsFromStorage();

    return killPromise;
  }

  signTransaction(
    txGroups: SignerTransaction[][],
    signerAddress?: string
  ): Promise<Uint8Array[]> {
    if (!this.connector) {
      throw new Error("PeraWalletConnect was not initialized correctly.");
    }

    const signTxnRequestParams = txGroups.flatMap((txGroup) =>
      txGroup.map<PeraWalletTransaction>((txGroupDetail) => {
        let signers: PeraWalletTransaction["signers"];

        if (signerAddress && !(txGroupDetail.signers || []).includes(signerAddress)) {
          signers = [];
        }

        const txnRequestParams: PeraWalletTransaction = {
          txn: encodeUnsignedTransactionInBase64(txGroupDetail.txn)
        };

        if (Array.isArray(signers)) {
          txnRequestParams.signers = signers;
        }

        return txnRequestParams;
      })
    );

    const formattedSignTxnRequest = formatJsonRpcRequest("algo_signTxn", [
      signTxnRequestParams
    ]);

    if (isMobile()) {
      // This is to automatically open the wallet app when trying to sign with it.
      openPeraWalletRedirectModal();
    }

    return this.connector
      .sendCustomRequest(formattedSignTxnRequest)
      .then((response: (string | null | Uint8Array)[]): Uint8Array[] => {
        // We send the full txn group to the mobile wallet.
        // Therefore, we first filter out txns that were not signed by the wallet.
        // These are received as `null`.
        const nonNullResponse = response.filter(Boolean) as (string | number[])[];

        // android returns a response Uint8Array[]
        // ios returns base64String[]
        return typeof nonNullResponse[0] === "string"
          ? (nonNullResponse as string[]).map(base64ToUint8Array)
          : (nonNullResponse as number[][]).map((item) => Uint8Array.from(item));
      })
      .catch((error) =>
        Promise.reject(
          new PeraWalletConnectError(
            {
              type: "SIGN_TRANSACTIONS",
              detail: error
            },
            error.message || "Failed to sign transaction"
          )
        )
      )
      .finally(() => removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID));
  }
}

export default PeraWalletConnect;
