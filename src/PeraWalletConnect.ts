/* eslint-disable max-lines */
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
  PERA_WALLET_SIGN_TXN_TOAST_ID,
  openPeraWalletSignTxnModal,
  closePeraWalletSignTxnModal,
  PERA_WALLET_IFRAME_ID,
  PERA_WALLET_MODAL_CLASSNAME
} from "./modal/peraWalletConnectModalUtils";
import {
  getWalletDetailsFromStorage,
  getLocalStorage,
  resetWalletDetailsFromStorage,
  saveWalletDetailsToStorage,
  getNetworkFromStorage,
  getWalletConnectObjectFromStorage
} from "./util/storage/storageUtils";
import {getWalletConnectConfig} from "./util/api/peraWalletConnectApi";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "./util/storage/storageConstants";
import {PeraWalletTransaction, SignerTransaction} from "./util/model/peraWalletModels";
import {
  base64ToUint8Array,
  encodeUnsignedTransactionInBase64
} from "./util/transaction/transactionUtils";
import {detectBrowser, isMobile} from "./util/device/deviceUtils";
import {AppMeta, PeraWalletNetwork} from "./util/peraWalletTypes";
import {generateEmbeddedWalletURL, getPeraWalletAppMeta} from "./util/peraWalletUtils";
import appTellerManager, {PeraTeller} from "./util/network/teller/appTellerManager";
import {getPeraWebWalletURL} from "./util/peraWalletConstants";
import {getMetaInfo} from "./util/dom/domUtils";

interface PeraWalletConnectOptions {
  bridge?: string;
  deep_link?: string;
  app_meta?: AppMeta;
  shouldShowSignTxnToast?: boolean;
  network?: PeraWalletNetwork;
}

function generatePeraWalletConnectModalActions(isWebWalletAvaliable: boolean) {
  return {
    open: openPeraWalletConnectModal(isWebWalletAvaliable),
    close: () => removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID)
  };
}

class PeraWalletConnect {
  bridge: string;
  connector: WalletConnect | null;
  shouldShowSignTxnToast: boolean;
  network = getNetworkFromStorage();

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

    if (options?.network) {
      this.network = options.network;
    }

    getLocalStorage()?.setItem(
      PERA_WALLET_LOCAL_STORAGE_KEYS.NETWORK,
      options?.network || "mainnet"
    );

    this.connector = null;
    this.shouldShowSignTxnToast =
      typeof options?.shouldShowSignTxnToast === "undefined"
        ? true
        : options.shouldShowSignTxnToast;
  }

  private connectWithWebWallet(
    resolve: (accounts: string[]) => void,
    webWalletURL: string
  ) {
    const browser = detectBrowser();
    const webWalletURLs = getPeraWebWalletURL(webWalletURL, this.network);

    const peraWalletIframe = document.createElement("iframe");

    function onReceiveMessage(event: MessageEvent<TellerMessage<PeraTeller>>) {
      if (resolve && event.data.message.type === "CONNECT_CALLBACK") {
        const accounts = event.data.message.data.addresses;

        saveWalletDetailsToStorage(accounts, "pera-wallet-web");

        resolve(accounts);

        onClose();

        document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
      } else if (
        ["CREATE_PASSCODE_EMBEDDED", "SELECT_ACCOUNT_EMBEDDED"].includes(
          event.data.message.type
        )
      ) {
        const peraWalletConnectModalWrapper = document.getElementById(
          PERA_WALLET_CONNECT_MODAL_ID
        );

        const peraWalletConnectModal = peraWalletConnectModalWrapper
          ?.querySelector("pera-wallet-connect-modal")
          ?.shadowRoot?.querySelector(`.${PERA_WALLET_MODAL_CLASSNAME}`);

        const peraWalletConnectModalDesktopMode = peraWalletConnectModal
          ?.querySelector("pera-wallet-modal-desktop-mode")
          ?.shadowRoot?.querySelector(".pera-wallet-connect-modal-desktop-mode");

        let messageType:
          | "CREATE_PASSCODE_EMBEDDED_CALLBACK"
          | "SELECT_ACCOUNT_EMBEDDED_CALLBACK"
          | null = null;

        if (
          peraWalletConnectModal &&
          peraWalletConnectModalDesktopMode &&
          event.data.message.type === "CREATE_PASSCODE_EMBEDDED"
        ) {
          peraWalletConnectModal.classList.add(
            `${PERA_WALLET_MODAL_CLASSNAME}--create-passcode`
          );
          peraWalletConnectModal.classList.remove(
            `${PERA_WALLET_MODAL_CLASSNAME}--select-account`
          );
          peraWalletConnectModalDesktopMode.classList.add(
            `pera-wallet-connect-modal-desktop-mode--create-passcode`
          );
          peraWalletConnectModalDesktopMode.classList.remove(
            `pera-wallet-connect-modal-desktop-mode--select-account`
          );

          messageType = "CREATE_PASSCODE_EMBEDDED_CALLBACK";
        } else if (
          peraWalletConnectModal &&
          peraWalletConnectModalDesktopMode &&
          event.data.message.type === "SELECT_ACCOUNT_EMBEDDED"
        ) {
          peraWalletConnectModal.classList.add(
            `${PERA_WALLET_MODAL_CLASSNAME}--select-account`
          );
          peraWalletConnectModal.classList.remove(
            `${PERA_WALLET_MODAL_CLASSNAME}--create-passcode`
          );
          peraWalletConnectModalDesktopMode.classList.add(
            `pera-wallet-connect-modal-desktop-mode--select-account`
          );
          peraWalletConnectModalDesktopMode.classList.remove(
            `pera-wallet-connect-modal-desktop-mode--create-passcode`
          );

          messageType = "SELECT_ACCOUNT_EMBEDDED_CALLBACK";
        }
        if (messageType) {
          appTellerManager.sendMessage({
            message: {
              type: messageType
            },
            origin: webWalletURLs.CONNECT,
            targetWindow: peraWalletIframe.contentWindow!
          });
        }
      }
    }

    function onWebWalletConnect(peraWalletIframeWrapper: Element) {
      if (browser === "Chrome") {
        peraWalletIframe.setAttribute("id", PERA_WALLET_IFRAME_ID);
        peraWalletIframe.setAttribute(
          "src",
          generateEmbeddedWalletURL(webWalletURLs.CONNECT)
        );

        peraWalletIframeWrapper.appendChild(peraWalletIframe);

        if (peraWalletIframe.contentWindow) {
          appTellerManager.sendMessage({
            message: {
              type: "CONNECT",
              data: getMetaInfo()
            },

            origin: webWalletURLs.CONNECT,
            targetWindow: peraWalletIframe.contentWindow
          });
        }

        appTellerManager.setupListener({
          onReceiveMessage
        });
      } else {
        const newPeraWalletTab = window.open(webWalletURLs.CONNECT, "_blank");

        if (newPeraWalletTab && newPeraWalletTab.opener) {
          appTellerManager.sendMessage({
            message: {
              type: "CONNECT",
              data: getMetaInfo()
            },

            origin: webWalletURLs.CONNECT,
            targetWindow: newPeraWalletTab
          });
        }

        appTellerManager.setupListener({
          onReceiveMessage: (event: MessageEvent<TellerMessage<PeraTeller>>) => {
            if (resolve && event.data.message.type === "CONNECT_CALLBACK") {
              const accounts = event.data.message.data.addresses;

              saveWalletDetailsToStorage(accounts, "pera-wallet-web");

              resolve(accounts);

              onClose();

              newPeraWalletTab?.close();
            }
          }
        });
      }
    }

    function onClose() {
      removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
    }

    return {
      onWebWalletConnect
    };
  }

  connect() {
    return new Promise<string[]>(async (resolve, reject) => {
      try {
        // check if already connected and kill session first before creating a new one.
        // This is to kill the last session and make sure user start from scratch whenever `.connect()` method is called.
        if (this.connector?.connected) {
          await this.connector.killSession();
        }

        const {isWebWalletAvaliable, bridgeURL, webWalletURL} =
          await getWalletConnectConfig(this.network);

        console.log(webWalletURL);

        const {onWebWalletConnect} = this.connectWithWebWallet(resolve, webWalletURL);

        // @ts-ignore ts-2339
        window.onWebWalletConnect = onWebWalletConnect;

        // Create Connector instance
        this.connector = new WalletConnect({
          bridge: this.bridge || bridgeURL || "https://bridge.walletconnect.org",
          qrcodeModal: generatePeraWalletConnectModalActions(isWebWalletAvaliable)
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
        const walletDetails = getWalletDetailsFromStorage();

        // ================================================= //
        // Pera Wallet Web flow
        if (walletDetails?.type === "pera-wallet-web") {
          resolve(walletDetails.accounts || []);
        }
        // ================================================= //

        // ================================================= //
        // Pera Mobile Wallet flow
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

  private async signTransactionWithMobile(signTxnRequestParams: PeraWalletTransaction[]) {
    const formattedSignTxnRequest = formatJsonRpcRequest("algo_signTxn", [
      signTxnRequestParams
    ]);

    try {
      try {
        const response = await this.connector!.sendCustomRequest(formattedSignTxnRequest);
        // We send the full txn group to the mobile wallet.
        // Therefore, we first filter out txns that were not signed by the wallet.
        // These are received as `null`.
        const nonNullResponse = response.filter(Boolean) as (string | number[])[];

        return typeof nonNullResponse[0] === "string"
          ? (nonNullResponse as string[]).map(base64ToUint8Array)
          : (nonNullResponse as number[][]).map((item) => Uint8Array.from(item));
      } catch (error) {
        return await Promise.reject(
          new PeraWalletConnectError(
            {
              type: "SIGN_TRANSACTIONS",
              detail: error
            },
            error.message || "Failed to sign transaction"
          )
        );
      }
    } finally {
      removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
      removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);
    }
  }

  private signTransactionWithWeb(
    signTxnRequestParams: PeraWalletTransaction[],
    webWalletURL: string
  ) {
    return new Promise<Uint8Array[]>((resolve, reject) => {
      const webWalletURLs = getPeraWebWalletURL(webWalletURL, this.network);
      const browser = detectBrowser();
      let newPeraWalletTab: Window | null;

      if (browser === "Chrome") {
        openPeraWalletSignTxnModal()
          .then((modal) => {
            const peraWalletSignTxnModal = modal;
            const peraWalletIframe = document.createElement("iframe");

            peraWalletIframe.setAttribute("id", PERA_WALLET_IFRAME_ID);
            peraWalletIframe.setAttribute(
              "src",
              generateEmbeddedWalletURL(webWalletURLs.TRANSACTION_SIGN)
            );

            peraWalletSignTxnModal?.appendChild(peraWalletIframe);

            if (peraWalletIframe.contentWindow) {
              appTellerManager.sendMessage({
                message: {
                  type: "SIGN_TXN",
                  txn: signTxnRequestParams
                },

                origin: generateEmbeddedWalletURL(webWalletURLs.ROOT),
                targetWindow: peraWalletIframe.contentWindow
              });
            }

            // Returns a promise that waits for the response from the web wallet.
            // The promise is resolved when the web wallet responds with the signed txn.
            // The promise is rejected when the web wallet responds with an error.
          })
          .catch((error) => {
            console.log(error);
          });
      } else {
        newPeraWalletTab = window.open(webWalletURLs.TRANSACTION_SIGN, "_blank");

        if (newPeraWalletTab && newPeraWalletTab.opener) {
          appTellerManager.sendMessage({
            message: {
              type: "SIGN_TXN",
              txn: signTxnRequestParams
            },

            origin: webWalletURLs.ROOT,
            targetWindow: newPeraWalletTab
          });
        }
      }

      appTellerManager.setupListener({
        onReceiveMessage: (event: MessageEvent<TellerMessage<PeraTeller>>) => {
          if (event.data.message.type === "SIGN_TXN_CALLBACK") {
            if (browser === "Chrome") {
              document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
              closePeraWalletSignTxnModal();
            }

            newPeraWalletTab?.close();

            resolve(
              event.data.message.signedTxns.map((txn) =>
                base64ToUint8Array(txn.signedTxn)
              )
            );
          }

          if (event.data.message.type === "SESSION_DISCONNECTED") {
            if (browser === "Chrome") {
              document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
              closePeraWalletSignTxnModal();
            }

            newPeraWalletTab?.close();

            reject(event.data.message.error);
          }

          if (event.data.message.type === "SIGN_TXN_CALLBACK_ERROR") {
            if (browser === "Chrome") {
              document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
              closePeraWalletSignTxnModal();
            }

            newPeraWalletTab?.close();

            reject(
              new PeraWalletConnectError(
                {
                  type: "SIGN_TRANSACTIONS_CANCELLED"
                },
                event.data.message.error
              )
            );
          }
        }
      });
    });
  }

  async signTransaction(
    txGroups: SignerTransaction[][],
    signerAddress?: string
  ): Promise<Uint8Array[]> {
    const walletDetails = getWalletDetailsFromStorage();

    if (walletDetails?.type === "pera-wallet") {
      if (isMobile()) {
        // This is to automatically open the wallet app when trying to sign with it.
        openPeraWalletRedirectModal();
      } else if (!isMobile() && this.shouldShowSignTxnToast) {
        // This is to inform user go the wallet app when trying to sign with it.
        openPeraWalletSignTxnToast();
      }

      if (!this.connector) {
        throw new Error("PeraWalletConnect was not initialized correctly.");
      }
    }

    // Prepare transactions to be sent to wallet
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

    // ================================================= //
    // Pera Wallet Web flow
    if (walletDetails?.type === "pera-wallet-web") {
      const {webWalletURL} = await getWalletConnectConfig(this.network);

      return this.signTransactionWithWeb(signTxnRequestParams, webWalletURL);
    }
    // ================================================= //

    // ================================================= //
    // Pera Mobile Wallet flow
    return this.signTransactionWithMobile(signTxnRequestParams);
    // ================================================= //
  }
}

export default PeraWalletConnect;
/* eslint-enable max-lines */
