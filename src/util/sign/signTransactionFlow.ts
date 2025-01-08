import PeraWalletConnectError from "../PeraWalletConnectError";
import {waitForTabOpening} from "../dom/domUtils";
import {PeraWalletArbitraryData, PeraWalletTransaction} from "../model/peraWalletModels";
import appTellerManager, {PeraTeller} from "../network/teller/appTellerManager";
import {getPeraWebWalletURL} from "../peraWalletConstants";
import {RunSignTransactionFlowParams} from "./signTransactionFlowModels";
import {newTabSignTransactionFlowTellerReducer} from "./signTransactionFlowReducers";

function runWebSignTransactionFlow({
  method,
  signTxnRequestParams,
  signer,
  chainId,
  webWalletURL,
  resolve,
  reject
}: RunSignTransactionFlowParams) {
  const webWalletURLs = getPeraWebWalletURL(webWalletURL);

  runNewTabSignFlow();

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
