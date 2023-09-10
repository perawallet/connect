// import {
//   openPeraWalletSignTxnModal,
//   PERA_WALLET_IFRAME_ID,
//   setupPeraWalletConnectModalCloseListener,
//   PERA_WALLET_SIGN_TXN_MODAL_ID,
//   getHeaderCloseButton
// } from "../../modal/peraWalletConnectModalUtils";
import PeraWalletConnectError from "../PeraWalletConnectError";
// import {peraWalletFlowType} from "../device/deviceUtils";
import {
  // WAIT_FOR_TAB_MAX_TRY_COUNT,
  // WAIT_FOR_TAB_TRY_INTERVAL,
  waitForTabOpening
} from "../dom/domUtils";
import {PeraWalletArbitraryData, PeraWalletTransaction} from "../model/peraWalletModels";
import appTellerManager, {PeraTeller} from "../network/teller/appTellerManager";
import {getPeraWebWalletURL} from "../peraWalletConstants";
// import {generateEmbeddedWalletURL} from "../peraWalletUtils";
import {RunSignTransactionFlowParams} from "./signTransactionFlowModels";
import {
  // embeddedSignTransactionFlowTellerReducer,
  newTabSignTransactionFlowTellerReducer
} from "./signTransactionFlowReducers";

function runWebSignTransactionFlow({
  method,
  signTxnRequestParams,
  signer,
  chainId,
  webWalletURL,
  // isCompactMode,
  resolve,
  reject
}: RunSignTransactionFlowParams) {
  const webWalletURLs = getPeraWebWalletURL(webWalletURL);

  runNewTabSignFlow();
  // switch (peraWalletFlowType()) {
  //   case "EMBEDDED":
  //     runEmbeddedSignTransactionFlow();
  //     break;

  //   case "NEW_TAB":
  //     break;

  //   default:
  //     break;
  // }

  // =========== Embedded Sign Flow ===========
  // async function runEmbeddedSignTransactionFlow() {
  //   const peraWalletSignTxnModalIFrameWrapper = await openPeraWalletSignTxnModal({
  //     isCompactMode
  //   });

  //   const peraWalletIframe = document.createElement("iframe");
  //   const peraWalletIframeSrc = generateEmbeddedWalletURL(
  //     webWalletURLs.TRANSACTION_SIGN,
  //     isCompactMode
  //   );
  //   const peraWalletIframeAllow = `hid ${peraWalletIframeSrc}; bluetooth ${peraWalletIframeSrc}`;

  //   peraWalletIframe.setAttribute("id", PERA_WALLET_IFRAME_ID);
  //   peraWalletIframe.setAttribute("src", peraWalletIframeSrc);
  //   peraWalletIframe.setAttribute("allow", peraWalletIframeAllow);

  //   peraWalletSignTxnModalIFrameWrapper?.appendChild(peraWalletIframe);

  //   setupPeraWalletConnectModalCloseListener(PERA_WALLET_SIGN_TXN_MODAL_ID, () =>
  //     reject(
  //       new PeraWalletConnectError(
  //         {
  //           type: `${method}_CANCELLED`
  //         },
  //         "Transaction signing is cancelled by user."
  //       )
  //     )
  //   );

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

  //         origin: webWalletURLs.TRANSACTION_SIGN,
  //         targetWindow: peraWalletIframe.contentWindow!
  //       });

  //       getHeaderCloseButton("sign-txn")?.addEventListener("click", () => {
  //         clearInterval(isIframeInitializedChecker);
  //       });
  //     }, WAIT_FOR_TAB_TRY_INTERVAL);

  //     appTellerManager.setupListener({
  //       onReceiveMessage: (event: MessageEvent<TellerMessage<PeraTeller>>) =>
  //         embeddedSignTransactionFlowTellerReducer({
  //           event,
  //           signTxnRequestParams,
  //           peraWalletIframe,
  //           isIframeInitializedChecker,
  //           webWalletURLs,
  //           method,
  //           signer,
  //           chainId,
  //           resolve,
  //           reject
  //         })
  //     });
  //   }
  // }

  // =========== New Tab Sign Flow ===========
  async function runNewTabSignFlow() {
    try {
      const newPeraWalletTab = await waitForTabOpening(webWalletURLs.TRANSACTION_SIGN);

      if (newPeraWalletTab) {
        let message;

        if (method === "SIGN_TXN") {
          message = {
            type: "SIGN_TXN",
            txn: signTxnRequestParams as PeraWalletTransaction[]
          } as const;
        } else if (method === "SIGN_DATA" && signer && chainId) {
          message = {
            type: "SIGN_DATA",
            data: signTxnRequestParams as PeraWalletArbitraryData[],

            signer,
            chainId
          } as const;
        }

        if (message) {
          appTellerManager.sendMessage({
            message,

            origin: webWalletURLs.TRANSACTION_SIGN,
            targetWindow: newPeraWalletTab
          });
        }
      }

      const checkTabIsAliveInterval = setInterval(() => {
        if (newPeraWalletTab?.closed === true) {
          reject(
            new PeraWalletConnectError(
              {
                type: `${method}_CANCELLED`
              },
              "Transaction signing is cancelled by user."
            )
          );

          clearInterval(checkTabIsAliveInterval);
        }

        // eslint-disable-next-line no-magic-numbers
      }, 2000);

      appTellerManager.setupListener({
        onReceiveMessage: (event: MessageEvent<TellerMessage<PeraTeller>>) =>
          newTabSignTransactionFlowTellerReducer({
            event,
            newPeraWalletTab,
            method,
            resolve,
            reject
          })
      });
    } catch (error) {
      reject(error);
    }
  }
}

export {runWebSignTransactionFlow};
