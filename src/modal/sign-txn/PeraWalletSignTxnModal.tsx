import "../_pera-wallet-modal.scss";
import "./_pera-wallet-sign-txn-modal.scss";

import React from "react";

import PeraWalletModalHeader from "../header/PeraWalletModalHeader";
import {PERA_WALLET_MODAL_CLASSNAME} from "../peraWalletConnectModalUtils";

interface PeraWalletSignTxnModalProps {
  onClose: VoidFunction;
}

function PeraWalletSignTxnModal({onClose}: PeraWalletSignTxnModalProps) {
  return (
    <div className={`${PERA_WALLET_MODAL_CLASSNAME} pera-wallet-sign-txn-modal`}>
      <div className={"pera-wallet-modal__body"}>
        <PeraWalletModalHeader onClose={onClose} />

        <div className={"pera-wallet-sign-txn-modal__body__content"} />
      </div>
    </div>
  );
}

export default PeraWalletSignTxnModal;
