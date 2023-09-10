import {
  // PERA_WALLET_IFRAME_ID,
  PERA_WALLET_CONNECT_MODAL_ID,
  removeModalWrapperFromDOM,
  // getHeaderCloseButton
} from "../../modal/peraWalletConnectModalUtils";
import PeraWalletConnectError from "../PeraWalletConnectError";
// import {peraWalletFlowType} from "../device/deviceUtils";
import {
  // WAIT_FOR_TAB_MAX_TRY_COUNT,
  // WAIT_FOR_TAB_TRY_INTERVAL,
  getMetaInfo,
  waitForTabOpening
} from "../dom/domUtils";
import appTellerManager, {PeraTeller} from "../network/teller/appTellerManager";
import {getPeraWebWalletURL} from "../peraWalletConstants";
// import {generateEmbeddedWalletURL} from "../peraWalletUtils";
import {RunWebConnectFlowTypes} from "./connectFlowModels";
import {
  // embeddedConnectFlowTellerReducer,
  newTabConnectFlowTellerReducer
} from "./connectFlowReducers";

function runWebConnectFlow({
  webWalletURL,
  chainId,
  // isCompactMode,
  resolve,
  reject
}: RunWebConnectFlowTypes) {
  const webWalletURLs = getPeraWebWalletURL(webWalletURL);

  // if (peraWalletFlowType() === "EMBEDDED") {
  //   return runEmbeddedWebConnectFlow;
  // }

  return runNewTabWebConnectFlow;

  // =========== Embedded Connect Flow ===========
  // function runEmbeddedWebConnectFlow(peraWalletIframeWrapper: Element) {
  //   const peraWalletIframe = document.createElement("iframe");

  //   peraWalletIframe.setAttribute("id", PERA_WALLET_IFRAME_ID);
  //   peraWalletIframe.setAttribute(
  //     "src",
  //     generateEmbeddedWalletURL(webWalletURLs.CONNECT, isCompactMode)
  //   );

  //   peraWalletIframeWrapper.appendChild(peraWalletIframe);

  //   if (peraWalletIframe.contentWindow) {
  //     let count = 0;

  //     const isIframeInitializedChecker = setInterval(() => {
  //       count += 1;

  //       if (count === WAIT_FOR_TAB_MAX_TRY_COUNT) {
  //         clearInterval(isIframeInitializedChecker);

  //         return;
  //       }

  //       appTellerManager.sendMessage({
  //         message: {
  //           type: "IFRAME_INITIALIZED"
  //         },

  //         origin: webWalletURLs.CONNECT,
  //         targetWindow: peraWalletIframe.contentWindow!
  //       });

  //       getHeaderCloseButton("connect")?.addEventListener("click", () => {
  //         clearInterval(isIframeInitializedChecker);
  //       });
  //     }, WAIT_FOR_TAB_TRY_INTERVAL);

  //     appTellerManager.setupListener({
  //       onReceiveMessage: (event: MessageEvent<TellerMessage<PeraTeller>>) =>
  //         embeddedConnectFlowTellerReducer({
  //           event,
  //           peraWalletIframe,
  //           chainId,
  //           isIframeInitializedChecker,
  //           webWalletURLs,
  //           resolve,
  //           reject
  //         })
  //     });
  //   }
  // }

  // =========== New Tab Connect Flow ===========
  async function runNewTabWebConnectFlow() {
    try {
      const newPeraWalletTab = await waitForTabOpening(webWalletURLs.CONNECT);

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
          closeWebConnectFlow();
        }

        // eslint-disable-next-line no-magic-numbers
      }, 2000);

      appTellerManager.setupListener({
        onReceiveMessage: (event: MessageEvent<TellerMessage<PeraTeller>>) =>
          newTabConnectFlowTellerReducer({event, newPeraWalletTab, resolve, reject})
      });
    } catch (error) {
      closeWebConnectFlow();

      reject(error);
    }
  }

  function closeWebConnectFlow() {
    removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
  }
}

export {runWebConnectFlow};
