import WalletConnect from "@walletconnect/client";
import {formatJsonRpcRequest} from "@json-rpc-tools/utils/dist/cjs/format";

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
import {PeraWalletTransaction, SignerTransaction} from "./util/model/peraWalletModels";
import {
  base64ToUint8Array,
  encodeUnsignedTransactionInBase64
} from "./util/transaction/transactionUtils";
import {isMobile} from "./util/device/deviceUtils";
import {PERA_WALLET_APP_DEEP_LINK} from "./util/peraWalletConstants";

interface PeraWalletConnectOptions {
  bridge: string;
}

const peraWalletConnectModalActions = {
  open: openPeraWalletConnectModal,
  close: closePeraWalletConnectModal
};

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
      window.open(PERA_WALLET_APP_DEEP_LINK, "_blank");
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
      );
  }
}

export default PeraWalletConnect;
