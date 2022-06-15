import "./_pera-wallet-connect-modal-pending-message.scss";

import React from "react";

import {getPeraWalletAppMeta} from "../../../util/peraWalletUtils";

interface PeraWalletConnectModalPendingMessageProps {
  onClose: () => void;
}

function PeraWalletConnectModalPendingMessage({
  onClose
}: PeraWalletConnectModalPendingMessageProps) {
  const {logo, name} = getPeraWalletAppMeta();

  return (
    <>
      <div className={"pera-wallet-connect-modal-pending-message"}>
        <img src={logo} alt={"Pera Wallet Logo"} />

        <div className={"pera-wallet-connect-modal-pending-message__text"}>
          {`Please wait while we connect you to`}

          <b>{` ${name}...`}</b>
        </div>
      </div>

      <button
        className={
          "pera-wallet-connect-button pera-wallet-connect-modal-pending-message__cancel-button"
        }
        onClick={handleCancelClick}>
        {"Cancel"}
      </button>
    </>
  );

  function handleCancelClick() {
    onClose();
  }
}

export default PeraWalletConnectModalPendingMessage;
