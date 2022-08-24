import "../_pera-wallet-modal.scss";
import "./_pera-wallet-sign-txn-modal.scss";

import PeraConnectIcon from "../../asset/icon/PeraConnect.svg";
import CloseIcon from "../../asset/icon/Close.svg";

import React from "react";

interface PeraWalletSignTxnModalProps {
  onClose: VoidFunction;
}

function PeraWalletSignTxnModal({onClose}: PeraWalletSignTxnModalProps) {
  return (
    <div className={"pera-wallet-modal pera-wallet-sign-txn-modal"}>
      <div className={"pera-wallet-modal__body"}>
        <div className={"pera-wallet-modal__body__header"}>
          <div className={"pera-wallet-modal__body__header__brand"}>
            <img src={PeraConnectIcon} />

            {"Pera Connect"}
          </div>

          <button
            className={"pera-wallet-button pera-wallet-modal__close-button"}
            onClick={onClose}>
            <img
              className={"pera-wallet-modal__close-button__close-icon"}
              src={CloseIcon}
            />
          </button>
        </div>

        <div className={"pera-wallet-sign-txn-modal__body__content"} />
      </div>
    </div>
  );
}

export default PeraWalletSignTxnModal;
