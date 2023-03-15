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
  openPeraWalletSignTxnModal,
  closePeraWalletSignTxnModal,
  PERA_WALLET_IFRAME_ID,
  PERA_WALLET_MODAL_CLASSNAME,
  PeraWalletModalConfig,
  PERA_WALLET_SIGN_TXN_MODAL_ID,
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
import {PeraWalletTransaction, SignerTransaction} from "./util/model/peraWalletModels";
import {
  base64ToUint8Array,
  composeTransaction,
  formatJsonRpcRequest
} from "./util/transaction/transactionUtils";
import {detectBrowser, isMobile} from "./util/device/deviceUtils";
import {AlgorandChainIDs} from "./util/peraWalletTypes";
import {generateEmbeddedWalletURL} from "./util/peraWalletUtils";
import appTellerManager, {PeraTeller} from "./util/network/teller/appTellerManager";
import {getPeraWebWalletURL} from "./util/peraWalletConstants";
import {
  getMetaInfo,
  waitForTabOpening,
  WAIT_FOR_TAB_MAX_TRY_COUNT,
  WAIT_FOR_TAB_TRY_INTERVAL
} from "./util/dom/domUtils";

interface PeraWalletConnectOptions {
  bridge?: string;
  shouldShowSignTxnToast?: boolean;
  chainId?: AlgorandChainIDs;
}

function generatePeraWalletConnectModalActions({
  isWebWalletAvailable,
  shouldDisplayNewBadge,
  shouldUseSound
}: PeraWalletModalConfig) {
  return {
    open: openPeraWalletConnectModal({
      isWebWalletAvailable,
      shouldDisplayNewBadge,
      shouldUseSound
    }),
    close: () => removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID)
  };
}

class PeraWalletConnect {
  bridge: string;
  connector: WalletConnect | null;
  shouldShowSignTxnToast: boolean;
  chainId?: number;

  constructor(options?: PeraWalletConnectOptions) {
    this.bridge = options?.bridge || "";

    this.connector = null;
    this.shouldShowSignTxnToast =
      typeof options?.shouldShowSignTxnToast === "undefined"
        ? true
        : options.shouldShowSignTxnToast;

    this.chainId = options?.chainId;
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

  private connectWithWebWallet(
    resolve: (accounts: string[]) => void,
    reject: (reason?: any) => void,
    webWalletURL: string,
    chainId: number | undefined
  ) {
    const browser = detectBrowser();
    const webWalletURLs = getPeraWebWalletURL(webWalletURL);
    const peraWalletIframe = document.createElement("iframe");

    function onWebWalletConnect(peraWalletIframeWrapper: Element) {
      if (browser === "Chrome") {
        peraWalletIframe.setAttribute("id", PERA_WALLET_IFRAME_ID);
        peraWalletIframe.setAttribute(
          "src",
          generateEmbeddedWalletURL(webWalletURLs.CONNECT)
        );

        peraWalletIframeWrapper.appendChild(peraWalletIframe);

        if (peraWalletIframe.contentWindow) {
          let count = 0;

          const checkIframeIsInitialized = setInterval(() => {
            count += 1;

            if (count === WAIT_FOR_TAB_MAX_TRY_COUNT) {
              clearInterval(checkIframeIsInitialized);

              return;
            }

            appTellerManager.sendMessage({
              message: {
                type: "IFRAME_INITIALIZED"
              },

              origin: webWalletURLs.CONNECT,
              targetWindow: peraWalletIframe.contentWindow!
            });
          }, WAIT_FOR_TAB_TRY_INTERVAL);

          appTellerManager.setupListener({
            onReceiveMessage: (event: MessageEvent<TellerMessage<PeraTeller>>) => {
              if (event.data.message.type === "IFRAME_INITIALIZED_RECEIVED") {
                clearInterval(checkIframeIsInitialized);
                appTellerManager.sendMessage({
                  message: {
                    type: "CONNECT",
                    data: {
                      ...getMetaInfo(),
                      chainId
                    }
                  },

                  origin: webWalletURLs.CONNECT,
                  targetWindow: peraWalletIframe.contentWindow!
                });
              } else if (resolve && event.data.message.type === "CONNECT_CALLBACK") {
                const accounts = event.data.message.data.addresses;

                saveWalletDetailsToStorage(accounts, "pera-wallet-web");

                resolve(accounts);

                onClose();

                document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
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

                document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
              } else if (
                ["CREATE_PASSCODE_EMBEDDED", "SELECT_ACCOUNT_EMBEDDED"].includes(
                  event.data.message.type
                )
              ) {
                if (event.data.message.type === "CREATE_PASSCODE_EMBEDDED") {
                  waitForTabOpening(webWalletURLs.CONNECT).then((newPeraWalletTab) => {
                    if (newPeraWalletTab) {
                      appTellerManager.sendMessage({
                        message: {
                          type: "CONNECT",
                          data: {
                            ...getMetaInfo(),
                            chainId
                          }
                        },

                        origin: webWalletURLs.CONNECT,
                        targetWindow: newPeraWalletTab
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

                        onClose();
                        clearInterval(checkTabIsAliveInterval);
                      }

                      // eslint-disable-next-line no-magic-numbers
                    }, 2000);

                    appTellerManager.setupListener({
                      onReceiveMessage: (
                        newTabEvent: MessageEvent<TellerMessage<PeraTeller>>
                      ) => {
                        if (
                          resolve &&
                          newTabEvent.data.message.type === "CONNECT_CALLBACK"
                        ) {
                          const accounts = newTabEvent.data.message.data.addresses;

                          saveWalletDetailsToStorage(accounts, "pera-wallet-web");

                          resolve(accounts);

                          onClose();

                          newPeraWalletTab?.close();
                        }
                      }
                    });
                  });
                } else if (event.data.message.type === "SELECT_ACCOUNT_EMBEDDED") {
                  const peraWalletConnectModalWrapper = document.getElementById(
                    PERA_WALLET_CONNECT_MODAL_ID
                  );

                  const peraWalletConnectModal = peraWalletConnectModalWrapper
                    ?.querySelector("pera-wallet-connect-modal")
                    ?.shadowRoot?.querySelector(`.${PERA_WALLET_MODAL_CLASSNAME}`);

                  const peraWalletConnectModalDesktopMode = peraWalletConnectModal
                    ?.querySelector("pera-wallet-modal-desktop-mode")
                    ?.shadowRoot?.querySelector(
                      ".pera-wallet-connect-modal-desktop-mode"
                    );

                  if (peraWalletConnectModal && peraWalletConnectModalDesktopMode) {
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
                  }

                  appTellerManager.sendMessage({
                    message: {
                      type: "SELECT_ACCOUNT_EMBEDDED_CALLBACK"
                    },
                    origin: webWalletURLs.CONNECT,
                    targetWindow: peraWalletIframe.contentWindow!
                  });
                }
              }
            }
          });
        }
      } else {
        waitForTabOpening(webWalletURLs.CONNECT)
          .then((newPeraWalletTab) => {
            if (newPeraWalletTab) {
              appTellerManager.sendMessage({
                message: {
                  type: "CONNECT",
                  data: {
                    ...getMetaInfo(),
                    chainId
                  }
                },

                origin: webWalletURLs.CONNECT,
                targetWindow: newPeraWalletTab
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
          })
          .catch((error) => {
            onClose();
            reject(error);
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
          shouldUseSound
        } = await getPeraConnectConfig();

        const {onWebWalletConnect} = this.connectWithWebWallet(
          resolve,
          reject,
          webWalletURL,
          this.chainId
        );

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
            shouldUseSound
          })
        });

        await this.connector.createSession({
          // eslint-disable-next-line no-magic-numbers
          chainId: this.chainId || 4160
        });

        setupPeraWalletConnectModalCloseListener(() =>
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
        // ================================================= //

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
  ) {
    return new Promise<Uint8Array[]>((resolve, reject) => {
      const webWalletURLs = getPeraWebWalletURL(webWalletURL);
      const browser = detectBrowser();

      if (browser === "Chrome") {
        openPeraWalletSignTxnModal()
          .then((modal) => {
            const peraWalletSignTxnModalIFrameWrapper = modal;

            const peraWalletIframe = document.createElement("iframe");
            const peraWalletIframeSrc = generateEmbeddedWalletURL(
              webWalletURLs.TRANSACTION_SIGN
            );
            const peraWalletIframeAllow = `hid ${peraWalletIframeSrc}; bluetooth ${peraWalletIframeSrc}`;

            peraWalletIframe.setAttribute("id", PERA_WALLET_IFRAME_ID);
            peraWalletIframe.setAttribute("src", peraWalletIframeSrc);
            peraWalletIframe.setAttribute("allow", peraWalletIframeAllow);

            peraWalletSignTxnModalIFrameWrapper?.appendChild(peraWalletIframe);

            const peraWalletSignTxnModalHeader = document
              .getElementById(PERA_WALLET_SIGN_TXN_MODAL_ID)
              ?.querySelector("pera-wallet-sign-txn-modal")
              ?.shadowRoot?.querySelector(`pera-wallet-modal-header`);

            const peraWalletSignTxnModalCloseButton =
              peraWalletSignTxnModalHeader?.shadowRoot?.getElementById(
                "pera-wallet-modal-header-close-button"
              );

            if (peraWalletSignTxnModalCloseButton) {
              peraWalletSignTxnModalCloseButton.addEventListener("click", () => {
                reject(
                  new PeraWalletConnectError(
                    {
                      type: "SIGN_TXN_CANCELLED"
                    },
                    "Transaction signing is cancelled by user."
                  )
                );

                removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_MODAL_ID);
              });
            }

            if (peraWalletIframe.contentWindow) {
              let count = 0;

              const checkIframeIsInitialized = setInterval(() => {
                count += 1;

                if (count === WAIT_FOR_TAB_MAX_TRY_COUNT) {
                  clearInterval(checkIframeIsInitialized);

                  return;
                }

                appTellerManager.sendMessage({
                  message: {
                    type: "IFRAME_INITIALIZED"
                  },

                  origin: webWalletURLs.CONNECT,
                  targetWindow: peraWalletIframe.contentWindow!
                });
              }, WAIT_FOR_TAB_TRY_INTERVAL);

              appTellerManager.setupListener({
                onReceiveMessage: (event: MessageEvent<TellerMessage<PeraTeller>>) => {
                  if (event.data.message.type === "IFRAME_INITIALIZED_RECEIVED") {
                    clearInterval(checkIframeIsInitialized);

                    appTellerManager.sendMessage({
                      message: {
                        type: "SIGN_TXN",
                        txn: signTxnRequestParams
                      },

                      origin: generateEmbeddedWalletURL(webWalletURLs.TRANSACTION_SIGN),
                      targetWindow: peraWalletIframe.contentWindow!
                    });
                  }

                  if (event.data.message.type === "SIGN_TXN_CALLBACK") {
                    document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
                    closePeraWalletSignTxnModal();

                    resolve(
                      event.data.message.signedTxns.map((txn) =>
                        base64ToUint8Array(txn.signedTxn)
                      )
                    );
                  }

                  if (event.data.message.type === "SIGN_TXN_NETWORK_MISMATCH") {
                    reject(
                      new PeraWalletConnectError(
                        {
                          type: "SIGN_TXN_NETWORK_MISMATCH",
                          detail: event.data.message.error
                        },
                        event.data.message.error || "Network mismatch"
                      )
                    );
                  }

                  if (event.data.message.type === "SESSION_DISCONNECTED") {
                    document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
                    closePeraWalletSignTxnModal();

                    resetWalletDetailsFromStorage();

                    reject(
                      new PeraWalletConnectError(
                        {
                          type: "SESSION_DISCONNECTED",
                          detail: event.data.message.error
                        },
                        event.data.message.error
                      )
                    );
                  }

                  if (event.data.message.type === "SIGN_TXN_CALLBACK_ERROR") {
                    document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
                    closePeraWalletSignTxnModal();

                    reject(
                      new PeraWalletConnectError(
                        {
                          type: "SIGN_TXN_CANCELLED"
                        },
                        event.data.message.error
                      )
                    );
                  }
                }
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
        waitForTabOpening(webWalletURLs.TRANSACTION_SIGN)
          .then((newPeraWalletTab) => {
            if (newPeraWalletTab) {
              appTellerManager.sendMessage({
                message: {
                  type: "SIGN_TXN",
                  txn: signTxnRequestParams
                },

                origin: webWalletURLs.TRANSACTION_SIGN,
                targetWindow: newPeraWalletTab
              });
            }

            const checkTabIsAliveInterval = setInterval(() => {
              if (newPeraWalletTab?.closed === true) {
                reject(
                  new PeraWalletConnectError(
                    {
                      type: "SIGN_TXN_CANCELLED"
                    },
                    "Transaction signing is cancelled by user."
                  )
                );

                clearInterval(checkTabIsAliveInterval);
              }

              // eslint-disable-next-line no-magic-numbers
            }, 2000);

            appTellerManager.setupListener({
              onReceiveMessage: (event: MessageEvent<TellerMessage<PeraTeller>>) => {
                if (event.data.message.type === "SIGN_TXN_CALLBACK") {
                  newPeraWalletTab?.close();

                  resolve(
                    event.data.message.signedTxns.map((txn) =>
                      base64ToUint8Array(txn.signedTxn)
                    )
                  );
                }

                if (event.data.message.type === "SIGN_TXN_NETWORK_MISMATCH") {
                  reject(
                    new PeraWalletConnectError(
                      {
                        type: "SIGN_TXN_NETWORK_MISMATCH",
                        detail: event.data.message.error
                      },
                      event.data.message.error || "Network mismatch"
                    )
                  );
                }

                if (event.data.message.type === "SESSION_DISCONNECTED") {
                  newPeraWalletTab?.close();

                  resetWalletDetailsFromStorage();

                  reject(
                    new PeraWalletConnectError(
                      {
                        type: "SESSION_DISCONNECTED",
                        detail: event.data.message.error
                      },
                      event.data.message.error
                    )
                  );
                }

                if (event.data.message.type === "SIGN_TXN_CALLBACK_ERROR") {
                  newPeraWalletTab?.close();

                  reject(
                    new PeraWalletConnectError(
                      {
                        type: "SIGN_TXN_CANCELLED"
                      },
                      event.data.message.error
                    )
                  );
                }
              }
            });
          })
          .catch((error) => {
            reject(error);
          });
      }
    });
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

    // ================================================= //
    // Pera Wallet Web flow
    if (this.platform === "web") {
      const {webWalletURL} = await getPeraConnectConfig();

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
