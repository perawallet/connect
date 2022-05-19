import CloseIcon from "../../asset/icon/Close.svg";
import PeraWalletLogo from "../../asset/icon/PeraWallet.svg";

import "../_pera-wallet-modal.scss";
import "./_pera-wallet-redirect-modal.scss";

import React, {useEffect} from "react";

import {PERA_WALLET_APP_DEEP_LINK} from "../../util/peraWalletConstants";

interface PeraWalletRedirectModalProps {
  onClose: () => void;
}

function PeraWalletRedirectModal({onClose}: PeraWalletRedirectModalProps) {
  useEffect(() => {
    const peraWalletDeepLink = window.open(PERA_WALLET_APP_DEEP_LINK);

    if (peraWalletDeepLink) {
      peraWalletDeepLink.addEventListener("load", onClose);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={"pera-wallet-connect-modal"}>
      <div className={"pera-wallet-connect-modal__body"}>
        <div className={"pera-wallet-connect-modal__body__header"}>
          <div className={"pera-wallet-connect-modal__logo"}>
            <PeraWalletLogo />
          </div>

          <button
            className={
              "pera-wallet-connect-button pera-wallet-connect-modal__close-button"
            }
            onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <a
          onClick={handleCloseRedirectModal}
          className={"pera-wallet-redirect-modal__launch-pera-wallet-button"}
          href={PERA_WALLET_APP_DEEP_LINK}
          rel={"noopener noreferrer"}
          target={"_blank"}>
          {"Launch Pera Wallet"}
        </a>
      </div>
    </div>
  );

  function handleCloseRedirectModal() {
    onClose();
  }
}

export default PeraWalletRedirectModal;
