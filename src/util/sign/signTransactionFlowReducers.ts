import PeraWalletConnectError from "../PeraWalletConnectError";
import {resetWalletDetailsFromStorage} from "../storage/storageUtils";
import {base64ToUint8Array} from "../transaction/transactionUtils";
import {NewTabSignTransactionFlowTellerReducerParams} from "./signTransactionFlowModels";

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

export {newTabSignTransactionFlowTellerReducer};
