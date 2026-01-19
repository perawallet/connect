/* eslint-disable max-lines */
import WalletConnect from "@walletconnect/client";
import algosdk from "algosdk";
import {sign_detached_verify} from "tweetnacl-ts";

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
import {concatArrays} from "./util/array/arrayUtils";
import {AlgodManager} from "./util/algod/algod";
import {DEFAULT_ALGORAND_NODE_PROVIDER_TYPE} from "./util/algod/algodConstants";
import {NetworkToggle} from "./util/algod/algodTypes";
import {getNetworkFromChainId} from "./util/algod/algodUtils";
import {PERA_WALLET_SIGNATURE_PREFIX} from "./util/peraWalletConstants";
import {getPublicSettings} from "./util/webview-api/webviewApi";

interface PeraWalletConnectOptions {
  bridge?: string;
  shouldShowSignTxnToast?: boolean;
  chainId?: AlgorandChainIDs;
  compactMode?: boolean;
  singleAccount?: boolean;
}

function generatePeraWalletConnectModalActions({
  isWebWalletAvailable,
  shouldDisplayNewBadge,
  shouldUseSound,
  compactMode,
  promoteMobile,
  singleAccount,
  selectedAccount,
  isInWebview
}: PeraWalletModalConfig) {
  return {
    open: openPeraWalletConnectModal({
      isWebWalletAvailable,
      shouldDisplayNewBadge,
      shouldUseSound,
      compactMode,
      promoteMobile,
      singleAccount,
      selectedAccount,
      isInWebview
    }),
    close: () => removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID)
  };
}

class PeraWalletConnect {
  bridge: string;
  connector: WalletConnect | null;
  shouldShowSignTxnToast: boolean;
  isInWebview: boolean;
  chainId?: AlgorandChainIDs;
  compactMode?: boolean;
  singleAccount?: boolean;
  private algodClients: Map<NetworkToggle, AlgodManager>;

  constructor(options?: PeraWalletConnectOptions) {
    this.bridge = options?.bridge || "";

    this.connector = null;
    this.shouldShowSignTxnToast =
      typeof options?.shouldShowSignTxnToast === "undefined"
        ? true
        : options.shouldShowSignTxnToast;

    this.chainId = options?.chainId;
    this.isInWebview = false;
    this.compactMode = options?.compactMode || false;
    this.singleAccount = options?.singleAccount || false;
    this.algodClients = new Map();
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

  get isPeraDiscoverBrowser() {
    return this.checkIsPeraDiscoverBrowser();
  }

  private async checkIsInWebview(): Promise<boolean> {
    if (isMobile()) {
      try {
        const publicSettings = await getPublicSettings();

        return publicSettings !== null;
      } catch {
        return false;
      }
    }

    return false;
  }

  // `selectedAccount` option is only applicable for Pera Wallet products
  connect(options?: {selectedAccount?: string}) {
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

        this.isInWebview = await this.checkIsInWebview();

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
            promoteMobile,
            singleAccount: this.singleAccount,
            selectedAccount: options?.selectedAccount,
            isInWebview: this.isInWebview
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
        this.isInWebview = await this.checkIsInWebview();

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

  verifySignature(
    data: Uint8Array,
    signature: Uint8Array,
    signerAddress: string
  ): boolean {
    try {
      const {publicKey} = algosdk.decodeAddress(signerAddress);
      const toBeVerified = concatArrays(PERA_WALLET_SIGNATURE_PREFIX, data);

      return sign_detached_verify(toBeVerified, signature, publicKey);
    } catch (error) {
      return false;
    }
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
    data: {data: string; message: string}[];
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

        return typeof response[0] === "string"
          ? (response as string[]).map(base64ToUint8Array)
          : (response as number[][]).map((item) => Uint8Array.from(item));
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

  private checkIsPeraDiscoverBrowser() {
    const userAget = window.navigator.userAgent;

    return userAget.includes("pera");
  }

  private getAlgodClient(network: NetworkToggle): AlgodManager {
    if (!this.algodClients.has(network)) {
      const algodClient = new AlgodManager({
        network,
        providerType: DEFAULT_ALGORAND_NODE_PROVIDER_TYPE
      });

      this.algodClients.set(network, algodClient);
    }

    return this.algodClients.get(network)!;
  }

  private async getAccountAuthAddr(signer: string, chainId: AlgorandChainIDs): Promise<string | null> {
    try {
      const network = getNetworkFromChainId(chainId);
      const algodClient = this.getAlgodClient(network);
      const accountInfo = await algodClient.client.accountInformation(signer).do();

      return accountInfo.authAddr ? String(accountInfo.authAddr) : null;
    } catch (error) {
      // If account fetch fails, return null to fall back to using the original signer
      // This ensures signing can proceed even if there's a network issue
      return null;
    }
  }

  async signTransaction(
    txGroups: SignerTransaction[][],
    signerAddress?: string
  ): Promise<Uint8Array[]> {
    if (this.platform === "mobile") {
      if (isMobile() && !this.isInWebview) {
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
  }

  async signData(data: PeraWalletArbitraryData[], signer: string, verifySignature?: boolean): Promise<Uint8Array[]> {
    // eslint-disable-next-line no-magic-numbers
    const chainId = this.chainId || 4160;

    if (this.platform === "mobile") {
      if (isMobile() && !this.isInWebview) {
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

    let signatures: Uint8Array[];

    // Pera Wallet Web flow
    if (this.platform === "web") {
      const {webWalletURL} = await getPeraConnectConfig();

      signatures = await this.signDataWithWeb({
        data,
        signer,
        chainId,
        webWalletURL
      });
    } else {
      const b64encodedData = data.map((item) => ({
        ...item,
        data: Buffer.from(item.data).toString("base64")
      }));

      // Pera Mobile Wallet flow
      signatures = await this.signDataWithMobile({data: b64encodedData, signer, chainId});
    }

    // Verify signatures if validateSignature is true
    if (verifySignature) {
      const authAddr = await this.getAccountAuthAddr(signer, chainId);
      const effectiveSigner = authAddr || signer;

      for (let i = 0; i < signatures.length; i++) {
        const signature = signatures[i];
        const originalData = data[i].data;

        if (!this.verifySignature(originalData, signature, effectiveSigner)) {
          throw new PeraWalletConnectError(
            {
              type: "SIGN_DATA_VERIFICATION_FAILED"
            },
            `Signature verification failed for data item at index ${i}`
          );
        }
      }
    }

    return signatures;
  }
}

export default PeraWalletConnect;
/* eslint-enable max-lines */
