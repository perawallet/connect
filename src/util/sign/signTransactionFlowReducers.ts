import {
  PERA_WALLET_IFRAME_ID,
  closePeraWalletSignTxnModal
} from "../../modal/peraWalletConnectModalUtils";
import PeraWalletConnectError from "../PeraWalletConnectError";
import {PeraWalletArbitraryData, PeraWalletTransaction} from "../model/peraWalletModels";
import appTellerManager from "../network/teller/appTellerManager";
import {generateEmbeddedWalletURL} from "../peraWalletUtils";
import {resetWalletDetailsFromStorage} from "../storage/storageUtils";
import {base64ToUint8Array} from "../transaction/transactionUtils";
import {
  EmbeddedSignTransactionFlowTellerReducerParams,
  NewTabSignTransactionFlowTellerReducerParams
} from "./signTransactionFlowModels";

// =========== Embedded Sign Flow ===========
function embeddedSignTransactionFlowTellerReducer({
  event,
  peraWalletIframe,
  signTxnRequestParams,
  isIframeInitializedChecker,
  webWalletURLs,
  signer,
  chainId,
  method,
  resolve,
  reject
}: EmbeddedSignTransactionFlowTellerReducerParams) {
  switch (event.data.message.type) {
    case "IFRAME_INITIALIZED_RECEIVED": {
      clearInterval(isIframeInitializedChecker);

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

          origin: generateEmbeddedWalletURL(webWalletURLs.TRANSACTION_SIGN),
          targetWindow: peraWalletIframe.contentWindow!
        });
      }

      break;
    }

    case "SIGN_TXN_CALLBACK":
      document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
      closePeraWalletSignTxnModal();

      resolve(
        event.data.message.signedTxns.map((txn) => base64ToUint8Array(txn.signedTxn))
      );
      break;

    case "SIGN_DATA_CALLBACK":
      document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
      closePeraWalletSignTxnModal();

      resolve(
        event.data.message.signedData.map((data) => base64ToUint8Array(data.signedData))
      );
      break;

    case "SIGN_TXN_NETWORK_MISMATCH" || "SIGN_DATA_NETWORK_MISMATCH":
      reject(
        new PeraWalletConnectError(
          {
            type: `${method}_NETWORK_MISMATCH`,
            detail: event.data.message.error
          },
          event.data.message.error || "Network mismatch"
        )
      );
      break;

    case "SIGN_TXN_CALLBACK_ERROR" || "SIGN_DATA_CALLBACK_ERROR":
      document.getElementById(PERA_WALLET_IFRAME_ID)?.remove();
      closePeraWalletSignTxnModal();

      reject(
        new PeraWalletConnectError(
          {
            type: `${method}_CANCELLED`
          },
          event.data.message.error
        )
      );
      break;

    case "SESSION_DISCONNECTED":
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
      break;

    default:
      break;
  }
}

// =========== New Tab Sign Flow ===========
function newTabSignTransactionFlowTellerReducer({
  event,
  newPeraWalletTab,
  method,
  resolve,
  reject
}: NewTabSignTransactionFlowTellerReducerParams) {
  switch (event.data.message.type) {
    case "SIGN_TXN_CALLBACK":
      newPeraWalletTab?.close();

      resolve(
        event.data.message.signedTxns.map((txn) => base64ToUint8Array(txn.signedTxn))
      );
      break;

    case "SIGN_DATA_CALLBACK":
      newPeraWalletTab?.close();

      resolve(
        event.data.message.signedData.map((data) => base64ToUint8Array(data.signedData))
      );
      break;

    case "SIGN_TXN_NETWORK_MISMATCH" || "SIGN_DATA_NETWORK_MISMATCH":
      reject(
        new PeraWalletConnectError(
          {
            type: `${method}_NETWORK_MISMATCH`,
            detail: event.data.message.error
          },
          event.data.message.error || "Network mismatch"
        )
      );
      break;

    case "SIGN_TXN_CALLBACK_ERROR" || "SIGN_DATA_CALLBACK_ERROR":
      newPeraWalletTab?.close();

      reject(
        new PeraWalletConnectError(
          {
            type: `${method}_CANCELLED`
          },
          event.data.message.error
        )
      );
      break;

    case "SESSION_DISCONNECTED":
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
      break;

    default:
      break;
  }
}

export {embeddedSignTransactionFlowTellerReducer, newTabSignTransactionFlowTellerReducer};
