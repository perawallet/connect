/* eslint-disable max-lines */
import WalletConnect from "@walletconnect/client";

import PeraWalletConnectError from "./util/PeraWalletConnectError";
import {
  openPeraWalletConnectModal,
  openPeraWalletRedirectModal,
  removeModalWrapperFromDOM,
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_REDIRECT_MODAL_ID,
  openPeraWalletSignTxnToast,
  PERA_WALLET_SIGN_TXN_TOAST_ID,
  PeraWalletModalConfig,
  setupPeraWalletConnectModalCloseListener
} from "./modal/peraWalletConnectModalUtils";
import {
  getWalletDetailsFromStorage,
  resetWalletDetailsFromStorage,
  saveWalletDetailsToStorage,
  getWalletConnectObjectFromStorage,
  getWalletPlatformFromStorage
} from "./util/storage/storageUtils";
import {getPeraConnectConfig} from "./util/api/peraWalletConnectApi";
import {
  PeraWalletArbitraryData,
  PeraWalletTransaction,
  SignerTransaction
} from "./util/model/peraWalletModels";
import {
  base64ToUint8Array,
  composeTransaction,
  formatJsonRpcRequest
} from "./util/transaction/transactionUtils";
import {isMobile} from "./util/device/deviceUtils";
import {AlgorandChainIDs} from "./util/peraWalletTypes";
import {runWebSignTransactionFlow} from "./util/sign/signTransactionFlow";
import {runWebConnectFlow} from "./util/connect/connectFlow";

interface PeraWalletConnectOptions {
  bridge?: string;
  shouldShowSignTxnToast?: boolean;
  chainId?: AlgorandChainIDs;
  compactMode?: boolean;
}

function generatePeraWalletConnectModalActions({
  isWebWalletAvailable,
  shouldDisplayNewBadge,
  shouldUseSound,
  compactMode,
  promoteMobile
}: PeraWalletModalConfig) {
  return {
    open: openPeraWalletConnectModal({
      isWebWalletAvailable,
      shouldDisplayNewBadge,
      shouldUseSound,
      compactMode,
      promoteMobile
    }),
    close: () => removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID)
  };
}

class PeraWalletConnect {
  bridge: string;
  connector: WalletConnect | null;
  shouldShowSignTxnToast: boolean;
  chainId?: AlgorandChainIDs;
  compactMode?: boolean;

  constructor(options?: PeraWalletConnectOptions) {
    this.bridge = options?.bridge || "";

    this.connector = null;
    this.shouldShowSignTxnToast =
      typeof options?.shouldShowSignTxnToast === "undefined"
        ? true
        : options.shouldShowSignTxnToast;

    this.chainId = options?.chainId;
    this.compactMode = options?.compactMode || false;
  }

  get platform() {
    return getWalletPlatformFromStorage();
  }

  get isConnected() {
    if (this.platform === "mobile") {
      return !!this.connector;
    } else if (this.platform === "web") {
      return !!getWalletDetailsFromStorage()?.accounts.length;
    }

    return false;
  }

  connect() {
    return new Promise<string[]>(async (resolve, reject) => {
      try {
        // check if already connected and kill session first before creating a new one.
        // This is to kill the last session and make sure user start from scratch whenever `.connect()` method is called.
        if (this.connector?.connected) {
          try {
            await this.connector.killSession();
          } catch (_error) {
            // No need to handle
          }
        }

        const {
          isWebWalletAvailable,
          bridgeURL,
          webWalletURL,
          shouldDisplayNewBadge,
          shouldUseSound,
          promoteMobile
        } = await getPeraConnectConfig();

        const onWebWalletConnect = runWebConnectFlow({
          resolve,
          reject,
          webWalletURL,
          chainId: this.chainId,
          isCompactMode: this.compactMode
        });

        if (isWebWalletAvailable) {
          // @ts-ignore ts-2339
          window.onWebWalletConnect = onWebWalletConnect;
        }

        // Create Connector instance
        this.connector = new WalletConnect({
          bridge: this.bridge || bridgeURL || "https://bridge.walletconnect.org",
          qrcodeModal: generatePeraWalletConnectModalActions({
            isWebWalletAvailable,
            shouldDisplayNewBadge,
            shouldUseSound,
            compactMode: this.compactMode,
            promoteMobile
          })
        });

        await this.connector.createSession({
          // eslint-disable-next-line no-magic-numbers
          chainId: this.chainId || 4160
        });

        setupPeraWalletConnectModalCloseListener(PERA_WALLET_CONNECT_MODAL_ID, () =>
          reject(
            new PeraWalletConnectError(
              {
                type: "CONNECT_MODAL_CLOSED"
              },
              "Connect modal is closed by user"
            )
          )
        );

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
            error.message || `There was an error while connecting to Pera Wallet`
          )
        );
      }
    });
  }

  reconnectSession() {
    return new Promise<string[]>(async (resolve, reject) => {
      try {
        const walletDetails = getWalletDetailsFromStorage();

        if (!walletDetails) {
          resolve([]);

          return;
        }

        // ================================================= //
        // Pera Wallet Web flow
        if (walletDetails?.type === "pera-wallet-web") {
          const {isWebWalletAvailable} = await getPeraConnectConfig();

          if (isWebWalletAvailable) {
            resolve(walletDetails.accounts || []);
          } else {
            reject(
              new PeraWalletConnectError(
                {
                  type: "SESSION_RECONNECT",
                  detail: "Pera Web is not available"
                },
                "Pera Web is not available"
              )
            );
          }
        }

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

        // If there is no wallet details in storage, resolve the promise with empty array
        if (!this.isConnected) {
          resolve([]);
        }
      } catch (error: any) {
        // If the bridge is not active, then disconnect
        await this.disconnect();

        reject(
          new PeraWalletConnectError(
            {
              type: "SESSION_RECONNECT",
              detail: error
            },
            error.message || `There was an error while reconnecting to Pera Wallet`
          )
        );
      }
    });
  }

  async disconnect() {
    let killPromise: Promise<void> | undefined;

    if (this.isConnected && this.platform === "mobile") {
      killPromise = this.connector?.killSession();

      killPromise?.then(() => {
        this.connector = null;
      });
    }

    await resetWalletDetailsFromStorage();
  }

  private async signTransactionWithMobile(signTxnRequestParams: PeraWalletTransaction[]) {
    const formattedSignTxnRequest = formatJsonRpcRequest("algo_signTxn", [
      signTxnRequestParams
    ]);

    try {
      try {
        const {silent} = await getPeraConnectConfig();

        const response = await this.connector!.sendCustomRequest(
          formattedSignTxnRequest,
          {
            forcePushNotification: !silent
          }
        );

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
  ): Promise<Uint8Array[]> {
    return new Promise<Uint8Array[]>((resolve, reject) =>
      runWebSignTransactionFlow({
        signTxnRequestParams,
        webWalletURL,
        method: "SIGN_TXN",
        // isCompactMode: this.compactMode,
        resolve,
        reject
      })
    );
  }

  private async signDataWithMobile({
    data,
    signer,
    chainId
  }: {
    // Converted Uin8Array data to base64
    data: {data: string; message: string;}[];
    signer: string;
    chainId: AlgorandChainIDs;
  }) {
    const formattedSignTxnRequest = formatJsonRpcRequest(
      "algo_signData",
      data.map((item) => ({
        ...item,

        signer,
        chainId
      }))
    );

    try {
      try {
        const {silent} = await getPeraConnectConfig();

        const response = await this.connector!.sendCustomRequest(
          formattedSignTxnRequest,
          {
            forcePushNotification: !silent
          }
        );

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

  private signDataWithWeb({
    data,
    signer,
    chainId,
    webWalletURL
  }: {
    data: PeraWalletArbitraryData[];
    signer: string;
    chainId: AlgorandChainIDs;
    webWalletURL: string;
  }): Promise<Uint8Array[]> {
    return new Promise<Uint8Array[]>((resolve, reject) =>
      runWebSignTransactionFlow({
        method: "SIGN_DATA",
        signTxnRequestParams: data,
        signer,
        chainId,
        webWalletURL,
        // isCompactMode: this.compactMode,
        resolve,
        reject
      })
    );
  }

  async signTransaction(
    txGroups: SignerTransaction[][],
    signerAddress?: string
  ): Promise<Uint8Array[]> {
    if (this.platform === "mobile") {
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
      txGroup.map<PeraWalletTransaction>((txGroupDetail) =>
        composeTransaction(txGroupDetail, signerAddress)
      )
    );

    // Pera Wallet Web flow
    if (this.platform === "web") {
      const {webWalletURL} = await getPeraConnectConfig();

      return this.signTransactionWithWeb(signTxnRequestParams, webWalletURL);
    }

    // Pera Mobile Wallet flow
    return this.signTransactionWithMobile(signTxnRequestParams);
    // ================================================= //
  }

  async signData(data: PeraWalletArbitraryData[], signer: string): Promise<Uint8Array[]> {
    // eslint-disable-next-line no-magic-numbers
    const chainId = this.chainId || 4160;

    if (this.platform === "mobile") {
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

    // Pera Wallet Web flow
    if (this.platform === "web") {
      const {webWalletURL} = await getPeraConnectConfig();

      return this.signDataWithWeb({
        data,
        signer,
        chainId,
        webWalletURL
      });
    }

    const b64encodedData = data.map((item) => ({
      ...item,
      data: Buffer.from(item.data).toString('base64')
    }));

    // Pera Mobile Wallet flow
    return this.signDataWithMobile({data: b64encodedData, signer, chainId});
  }
}

export default PeraWalletConnect;
/* eslint-enable max-lines */
