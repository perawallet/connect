import {
  PERA_WALLET_CONNECT_MODAL_ID,
  removeModalWrapperFromDOM
} from "../../modal/peraWalletConnectModalUtils";
import PeraWalletConnectError from "../PeraWalletConnectError";
import {saveWalletDetailsToStorage} from "../storage/storageUtils";
import {NewTabConnectFlowTellerReducerParams} from "./connectFlowModels";

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

export {newTabConnectFlowTellerReducer};
