import WalletConnect from "@walletconnect/client";
import {formatJsonRpcRequest} from "@json-rpc-tools/utils/dist/cjs/format";

import PeraWalletConnectError from "./util/PeraWalletConnectError";
import {
  openPeraWalletConnectModal,
  openPeraWalletRedirectModal,
  removeModalWrapperFromDOM,
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_REDIRECT_MODAL_ID,
  openPeraWalletSignTxnToast,
  PERA_WALLET_SIGN_TXN_TOAST_ID
} from "./modal/peraWalletConnectModalUtils";
import {
  getLocalStorage,
  getWalletConnectObjectFromStorage,
  resetWalletDetailsFromStorage,
  saveWalletDetailsToStorage
} from "./util/storage/storageUtils";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "./util/storage/storageConstants";
import {PeraWalletTransaction, SignerTransaction} from "./util/model/peraWalletModels";
import {
  base64ToUint8Array,
  encodeUnsignedTransactionInBase64
} from "./util/transaction/transactionUtils";
import {isMobile} from "./util/device/deviceUtils";
import {AppMeta} from "./util/peraWalletTypes";
import {
  generatePeraWalletAppDeepLink,
  getPeraWalletAppMeta
} from "./util/peraWalletUtils";
import {getWalletConnectConfig} from "./util/api/peraWalletConnectApi";

interface PeraWalletConnectOptions {
  bridge?: string;
  deep_link?: string;
  app_meta?: AppMeta;
  shouldShowSignTxnToast?: boolean;
}

function generatePeraWalletConnectModalActions(rejectPromise?: (error: any) => void) {
  return {
    open: openPeraWalletConnectModal(rejectPromise),
    close: () => removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID)
  };
}

class PeraWalletConnect {
  bridge: string;
  connector: WalletConnect | null;
  shouldShowSignTxnToast: boolean;

  constructor(options?: PeraWalletConnectOptions) {
    this.bridge = options?.bridge || "";

    if (options?.deep_link) {
      getLocalStorage()?.setItem(
        PERA_WALLET_LOCAL_STORAGE_KEYS.DEEP_LINK,
        options.deep_link
      );
    }

    if (options?.app_meta) {
      getLocalStorage()?.setItem(
        PERA_WALLET_LOCAL_STORAGE_KEYS.APP_META,
        JSON.stringify(options.app_meta)
      );
    }

    this.connector = null;
    this.shouldShowSignTxnToast =
      typeof options?.shouldShowSignTxnToast === "undefined"
        ? true
        : options.shouldShowSignTxnToast;
  }

  connect() {
    return new Promise<string[]>(async (resolve, reject) => {
      try {
        // check if already connected and kill session first before creating a new one.
        // This is to kill the last session and make sure user start from scratch whenever `.connect()` method is called.
        if (this.connector?.connected) {
          await this.connector.killSession();
        }

        const {bridgeURL} = await getWalletConnectConfig();

        // Create Connector instance
        this.connector = new WalletConnect({
          bridge: this.bridge || bridgeURL || "https://bridge.walletconnect.org",
          qrcodeModal: generatePeraWalletConnectModalActions(reject)
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

  reconnectSession() {
    return new Promise<string[]>(async (resolve, reject) => {
      try {
        if (this.connector) {
          resolve(this.connector.accounts || []);
        }

        this.bridge = getWalletConnectObjectFromStorage()?.bridge || "";

        if (this.bridge) {
          this.connector = new WalletConnect({
            bridge: this.bridge
          });

          resolve(this.connector?.accounts || []);
        }

        reject(
          new PeraWalletConnectError(
            {
              type: "SESSION_RECONNECT",
              detail: ""
            },
            "The bridge server is not active anymore. Disconnecting."
          )
        );
        // ================================================= //
      } catch (error: any) {
        // If the bridge is not active, then disconnect
        await this.disconnect();

        const {name} = getPeraWalletAppMeta();

        reject(
          new PeraWalletConnectError(
            {
              type: "SESSION_RECONNECT",
              detail: error
            },
            error.message || `There was an error while reconnecting to ${name}`
          )
        );
      }
    });
  }

  async disconnect() {
    const killPromise = this.connector?.killSession();

    killPromise?.then(() => {
      this.connector = null;
    });

    await resetWalletDetailsFromStorage();

    return killPromise;
  }

  signTransaction(
    txGroups: SignerTransaction[][],
    signerAddress?: string
  ): Promise<Uint8Array[]> {
    if (!this.connector) {
      throw new Error("PeraWalletConnect was not initialized correctly.");
    }

    if (isMobile()) {
      let peraWalletAppDeeplink;

      try {
        // This is to automatically open the wallet app when trying to sign with it.
        peraWalletAppDeeplink = window.open(generatePeraWalletAppDeepLink(), "_blank");
      } catch (error) {
        console.log(error);
      } finally {
        if (!peraWalletAppDeeplink) {
          openPeraWalletRedirectModal();
        }
      }
    } else if (!isMobile() && this.shouldShowSignTxnToast) {
      // This is to inform user go the wallet app when trying to sign with it.
      openPeraWalletSignTxnToast();
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
      .finally(() => {
        removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
        removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);
      });
  }
}

export default PeraWalletConnect;
