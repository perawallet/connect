/* eslint-disable max-lines */
import Client from "@walletconnect/sign-client";
import {getSdkError, getAppMetadata} from "@walletconnect/utils";
import {SessionTypes} from "@walletconnect/types";

import PeraWalletConnectError from "./util/PeraWalletConnectError";
import {
  openPeraWalletConnectModal,
  openPeraWalletRedirectModal,
  removeModalWrapperFromDOM,
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_REDIRECT_MODAL_ID,
  openPeraWalletSignTxnToast,
  PERA_WALLET_SIGN_TXN_TOAST_ID,
  PERA_WALLET_MODAL_CLASSNAME
} from "./modal/peraWalletConnectModalUtils";
import {
  getWalletDetailsFromStorage,
  saveWalletDetailsToStorage,
  getNetworkFromStorage,
  getWalletPlatformFromStorage,
  getLocalStorage,
  resetWalletDetailsFromStorage
} from "./util/storage/storageUtils";
import {getPeraConnectConfig} from "./util/api/peraWalletConnectApi";
import {PeraWalletArbitraryData, PeraWalletTransaction, SignerTransaction} from "./util/model/peraWalletModels";
import {
  base64ToUint8Array,
  composeTransaction,
  formatJsonRpcRequest
} from "./util/transaction/transactionUtils";
import {isMobile} from "./util/device/deviceUtils";
import {AlgorandChainIDs, PeraWalletNetwork} from "./util/peraWalletTypes";
import {runWebSignTransactionFlow} from "./util/sign/signTransactionFlow";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "./util/storage/storageConstants";
import {AlgorandChainNamespace, AlgorandMethod, getPeraWebWalletURL} from "./util/peraWalletConstants";
import appTellerManager, {PeraTeller} from "./util/network/teller/appTellerManager";
import {getMetaInfo, waitForTabOpening} from "./util/dom/domUtils";
import {formatWalletConnectSessionResponse} from "./util/wallet-connect/walletConnectUtils";

interface PeraWalletConnectOptions {
  projectId: string;
  network?: PeraWalletNetwork;
  shouldShowSignTxnToast?: boolean;
  chainId?: AlgorandChainIDs;
  compactMode?: boolean;
  debugger?: boolean;
}

class PeraWalletConnect {
  client: Client | null;
  shouldShowSignTxnToast: boolean;
  network = getNetworkFromStorage();
  session: SessionTypes.Struct | null;
  projectId?: string;
  chainId?: number;
  compactMode?: boolean;
  debugger?: boolean;

  constructor(options: PeraWalletConnectOptions) {
    this.projectId = options.projectId;
    this.debugger = options.debugger;

    if (options?.network) {
      this.network = options.network;
    }

    getLocalStorage()?.setItem(
      PERA_WALLET_LOCAL_STORAGE_KEYS.NETWORK,
      options?.network || "mainnet"
    );

    this.shouldShowSignTxnToast =
      typeof options?.shouldShowSignTxnToast === "undefined"
        ? true
        : options.shouldShowSignTxnToast;

    this.chainId = options?.chainId;
    this.compactMode = options?.compactMode || false;

    window.addEventListener("DOMContentLoaded", async () => {
      this.client = await this.createClient();
    });
  }

  get platform() {
    return getWalletPlatformFromStorage();
  }

  get isConnected() {
    if (this.platform === "mobile" || this.platform === "web") {
      return !!getWalletDetailsFromStorage()?.accounts.length;
    }

    return false;
  }

  get accounts() {
    return getWalletDetailsFromStorage()?.accounts;
  }

  private connectWithWebWallet(
    resolve: (accounts: string[]) => void,
    reject: (reason?: any) => void,
    webWalletURL: string,
    chainId: number | undefined
  ) {
    const webWalletURLs = getPeraWebWalletURL(webWalletURL);

    function onWebWalletConnect() {
      waitForTabOpening(webWalletURLs.CONNECT).then((newPeraWalletTab) => {
        if (newPeraWalletTab && newPeraWalletTab.opener) {
          appTellerManager.sendMessage({
            message: {
              type: "CONNECT",
              data: {
                ...getMetaInfo(),
                chainId
              }
            },

            origin: webWalletURLs.CONNECT,
            targetWindow: newPeraWalletTab,
            timeout: 5000
          });
        }

        const checkTabIsAliveInterval = setInterval(() => {
          if (newPeraWalletTab?.closed === true) {
            reject(
              new PeraWalletConnectError(
                {
                  type: "CONNECT_CANCELLED"
                },
                "Connect is cancelled by user"
              )
            );

            clearInterval(checkTabIsAliveInterval);
            onClose();
          }

          // eslint-disable-next-line no-magic-numbers
        }, 2000);

        appTellerManager.setupListener({
          onReceiveMessage: (event: MessageEvent<TellerMessage<PeraTeller>>) => {
            if (resolve && event.data.message.type === "CONNECT_CALLBACK") {
              const accounts = event.data.message.data.addresses;

              saveWalletDetailsToStorage(accounts, "pera-wallet-web");

              resolve(accounts);

              onClose();

              newPeraWalletTab?.close();
            } else if (event.data.message.type === "CONNECT_NETWORK_MISMATCH") {
              reject(
                new PeraWalletConnectError(
                  {
                    type: "CONNECT_NETWORK_MISMATCH",
                    detail: event.data.message.error
                  },
                  event.data.message.error ||
                  `Your wallet is connected to a different network to this dApp. Update your wallet to the correct network (MainNet or TestNet) to continue.`
                )
              );

              onClose();

              newPeraWalletTab?.close();
            }
          }
        });
      });
    }

    function onClose() {
      removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
    }

    return onWebWalletConnect;
  }

  connect({network}: {network?: PeraWalletNetwork} = {}) {
    return new Promise<string[]>(async (resolve, reject) => {
      try {
        if (network) {
          // override network if provided
          getLocalStorage()?.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.NETWORK, network);
        }

        const {
          isWebWalletAvailable,
          webWalletURL,
          shouldDisplayNewBadge,
          shouldUseSound,
          promoteMobile
        } = await getPeraConnectConfig();

        const onWebWalletConnect = this.connectWithWebWallet(
          resolve,
          reject,
          webWalletURL,
          this.chainId
        );

        if (isWebWalletAvailable) {
          // @ts-ignore ts-2339
          window.onWebWalletConnect = onWebWalletConnect;
        }

        if (!this.client) {
          this.client = await this.createClient();
        }

        const {uri, approval} = await this.client.connect({
          requiredNamespaces: {
            algorand: {
              chains: [
                AlgorandChainNamespace.Mainnet,
                AlgorandChainNamespace.Testnet
              ],
              methods: [
                AlgorandMethod.SignTransaction,
                AlgorandMethod.SignData
              ],
              events: []
            }
          }
        });

        if (uri) {
          openPeraWalletConnectModal({
            uri,
            isWebWalletAvailable,
            shouldDisplayNewBadge,
            shouldUseSound,
            compactMode: this.compactMode,
            promoteMobile
          });

          const peraWalletConnectModalWrapper = document.getElementById(
            PERA_WALLET_CONNECT_MODAL_ID
          );

          const peraWalletConnectModal = peraWalletConnectModalWrapper
            ?.querySelector("pera-wallet-connect-modal")
            ?.shadowRoot?.querySelector(`.${PERA_WALLET_MODAL_CLASSNAME}`);

          const closeButton = peraWalletConnectModal
            ?.querySelector("pera-wallet-modal-header")
            ?.shadowRoot?.getElementById("pera-wallet-modal-header-close-button");

          closeButton?.addEventListener("click", () => {
            reject(
              new PeraWalletConnectError(
                {
                  type: "CONNECT_MODAL_CLOSED"
                },
                "Connect modal is closed by user"
              )
            );

            removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
          });
        }

        this.session = await approval();

        const {namespace, reference, accounts} = formatWalletConnectSessionResponse(
          this.session
        );

        saveWalletDetailsToStorage(
          accounts || [],
          "pera-wallet",
          `${namespace}:${reference}`
        );

        resolve(accounts);
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
      } finally {
        removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
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

        // Do not reconnect if the last session was connected with Wallet Connect v1
        if (!walletDetails?.version) {
          await resetWalletDetailsFromStorage();

          reject(
            new PeraWalletConnectError(
              {
                type: "SESSION_RECONNECT",
                detail: "Failed to reconnect session. Wallet Connect version mismatch."
              },
              "Failed to reconnect session. Please try to connect again."
            )
          );
        }

        // ================================================= //
        // Pera Wallet Web flow
        if (walletDetails?.type === "pera-wallet-web") {
          const {isWebWalletAvailable} = await getPeraConnectConfig();

          if (!isWebWalletAvailable) {
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

        if (this.isConnected) {
          if (!this.client) {
            this.client = await this.createClient();
          }

          resolve(walletDetails!.accounts);
        }
        // If there is no wallet details in storage, resolve the promise with empty array
        else {
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

  private async createClient() {
    try {
      const client = await Client.init({
        relayUrl: "wss://relay.walletconnect.com",
        projectId: this.projectId,
        metadata: getAppMetadata(),
        logger: this.debugger ? "debug" : undefined
      });

      this.client = client;

      this.checkPersistedState(client);

      return client;
    } catch (err) {
      throw err;
    }
  }

  private checkPersistedState(client: Client) {
    if (typeof this.session !== "undefined") return;
    // populates (the last) existing session to state

    if (client.session.length) {
      const lastKeyIndex = client!.session.keys.length - 1;
      const session = client.session.get(client.session.keys[lastKeyIndex]);

      this.session = session;

      const {namespace, reference, accounts} = formatWalletConnectSessionResponse(
        this.session
      );

      saveWalletDetailsToStorage(
        accounts || [],
        "pera-wallet",
        `${namespace}:${reference}`
      );
    }
  }

  disconnect() {
    return new Promise(async (resolve, reject) => {
      if (this.isConnected && this.platform === "mobile") {
        if (typeof this.client === "undefined") {
          reject(new Error("WalletConnect client could not initialized"));
        }

        if (typeof this.client?.session === "undefined") {
          reject(new Error("WalletConnect session could not initialized"));
        }

        try {
          if (this.session && this.client) {
            await this.client.disconnect({
              topic: this.session.topic,
              reason: getSdkError("USER_DISCONNECTED")
            });

            this.client = null;
            this.session = null;
            resolve(null);
          }
        } catch (error) {
          reject(error);
        }
      }

      await resetWalletDetailsFromStorage();
      resolve(null);
    });
  }

  private async signTransactionWithMobile(signTxnRequestParams: PeraWalletTransaction[]) {
    const formattedSignTxnRequest = formatJsonRpcRequest(
      AlgorandMethod.SignTransaction, [signTxnRequestParams]
    );
    const walletDetails = getWalletDetailsFromStorage();

    try {
      try {
        if (walletDetails?.chainId) {
          const response = await this.client!.request<any>({
            topic: this.session!.topic,
            request: formattedSignTxnRequest,
            chainId: walletDetails.chainId
          });

          // We send the full txn group to the mobile wallet.
          // Therefore, we first filter out txns that were not signed by the wallet.
          // These are received as `null`.
          const nonNullResponse = response.filter(Boolean) as (string | number[])[];

          return typeof nonNullResponse[0] === "string"
            ? (nonNullResponse as string[]).map(base64ToUint8Array)
            : (nonNullResponse as number[][]).map((item) => Uint8Array.from(item));
        }

        return await Promise.reject(
          new PeraWalletConnectError(
            {
              type: "SIGN_TRANSACTIONS",
              detail: "Failed to sign transaction"
            },
            "Failed to sign transaction"
          )
        );
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
    // Converted Uint8Array data to base64
    data: {data: string; message: string;}[];
    signer: string;
    chainId: AlgorandChainIDs;
  }) {
    const formattedSignDataRequest = formatJsonRpcRequest(
      AlgorandMethod.SignData,
      data.map((item) => ({
        ...item,
        signer,
        chainID: chainId
      }))
    );

    try {
      try {
        const walletDetails = getWalletDetailsFromStorage();

        const response = await this.client!.request<any>({
          topic: this.session!.topic,
          request: formattedSignDataRequest,
          chainId: walletDetails?.chainId || "4610"
        });

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

      if (!this.client) {
        throw new Error("PeraWalletConnect was not initialized correctly while signing transaction.");
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

  signData(data: PeraWalletArbitraryData[], signer: string): Promise<Uint8Array[]> {
    // eslint-disable-next-line no-magic-numbers
    const chainId = (this.chainId || 4160) as AlgorandChainIDs;

    if (this.platform === "mobile") {
      if (isMobile()) {
        // This is to automatically open the wallet app when trying to sign with it.
        openPeraWalletRedirectModal();
      } else if (!isMobile() && this.shouldShowSignTxnToast) {
        // This is to inform user go the wallet app when trying to sign with it.
        openPeraWalletSignTxnToast();
      }

      if (!this.client) {
        throw new Error("PeraWalletConnect was not initialized correctly.");
      }
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
