import {
  PERA_WALLET_CONNECT_MODAL_ID,
  removeModalWrapperFromDOM
} from "../../modal/peraWalletConnectModalUtils";
import PeraWalletConnectError from "../PeraWalletConnectError";
import {getMetaInfo, waitForTabOpening} from "../dom/domUtils";
import appTellerManager, {PeraTeller} from "../network/teller/appTellerManager";
import {getPeraWebWalletURL} from "../peraWalletConstants";
import {RunWebConnectFlowTypes} from "./connectFlowModels";
import {newTabConnectFlowTellerReducer} from "./connectFlowReducers";

function runWebConnectFlow({
  webWalletURL,
  chainId,
  resolve,
  reject
}: RunWebConnectFlowTypes) {
  const webWalletURLs = getPeraWebWalletURL(webWalletURL);

  return runNewTabWebConnectFlow;

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
