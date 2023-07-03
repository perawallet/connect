import {
  PERA_WALLET_IFRAME_ID,
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_MODAL_CLASSNAME,
  removeModalWrapperFromDOM
} from "../../modal/peraWalletConnectModalUtils";
import PeraWalletConnectError from "../PeraWalletConnectError";
import {getMetaInfo, waitForTabOpening} from "../dom/domUtils";
import appTellerManager, {PeraTeller} from "../network/teller/appTellerManager";
import {saveWalletDetailsToStorage} from "../storage/storageUtils";
import {
  EmbeddedConnectFlowTellerReducerParams,
  NewTabConnectFlowTellerReducerParams
} from "./connectFlowModels";

// =========== Embedded Connect Flow ===========
function embeddedConnectFlowTellerReducer({
  event,
  peraWalletIframe,
  chainId,
  isIframeInitializedChecker,
  webWalletURLs,
  resolve,
  reject
}: EmbeddedConnectFlowTellerReducerParams) {
  switch (event.data.message.type) {
    case "IFRAME_INITIALIZED_RECEIVED":
      clearInterval(isIframeInitializedChecker);

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
      break;

    case "CONNECT_CALLBACK": {
      const accounts = event.data.message.data.addresses;

      saveWalletDetailsToStorage(accounts, "pera-wallet-web");

      resolve(accounts);

      removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);

      document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();

      break;
    }

    case "CONNECT_NETWORK_MISMATCH":
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

      removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);

      document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
      break;

    case "CREATE_PASSCODE_EMBEDDED": {
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

            removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
            clearInterval(checkTabIsAliveInterval);
          }

          // eslint-disable-next-line no-magic-numbers
        }, 2000);

        appTellerManager.setupListener({
          onReceiveMessage: (newTabEvent: MessageEvent<TellerMessage<PeraTeller>>) => {
            if (resolve && newTabEvent.data.message.type === "CONNECT_CALLBACK") {
              const accounts = newTabEvent.data.message.data.addresses;

              saveWalletDetailsToStorage(accounts, "pera-wallet-web");

              resolve(accounts);

              removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);

              newPeraWalletTab?.close();
            }
          }
        });
      });

      break;
    }

    case "SELECT_ACCOUNT_EMBEDDED": {
      const peraWalletConnectModalWrapper = document.getElementById(
        PERA_WALLET_CONNECT_MODAL_ID
      );

      const peraWalletConnectModal = peraWalletConnectModalWrapper
        ?.querySelector("pera-wallet-connect-modal")
        ?.shadowRoot?.querySelector(`.${PERA_WALLET_MODAL_CLASSNAME}`);

      const peraWalletConnectModalDesktopMode = peraWalletConnectModal
        ?.querySelector("pera-wallet-modal-desktop-mode")
        ?.shadowRoot?.querySelector(".pera-wallet-connect-modal-desktop-mode");

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

      break;
    }

    default:
      break;
  }
}

// =========== New Tab Connect Flow ===========
function newTabConnectFlowTellerReducer({
  event,
  newPeraWalletTab,
  resolve,
  reject
}: NewTabConnectFlowTellerReducerParams) {
  if (resolve && event.data.message.type === "CONNECT_CALLBACK") {
    const accounts = event.data.message.data.addresses;

    saveWalletDetailsToStorage(accounts, "pera-wallet-web");

    resolve(accounts);

    removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);

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

    removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);

    newPeraWalletTab?.close();
  }
}

export {embeddedConnectFlowTellerReducer, newTabConnectFlowTellerReducer};
