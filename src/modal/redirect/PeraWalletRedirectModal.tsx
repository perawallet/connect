import CloseIcon from "../../asset/icon/Close.svg";

import "../_pera-wallet-modal.scss";
import "./_pera-wallet-redirect-modal.scss";

import React, {useEffect} from "react";

import {
  generatePeraWalletAppDeepLink,
  getPeraWalletAppMeta
} from "../../util/peraWalletUtils";

interface PeraWalletRedirectModalProps {
  onClose: () => void;
}

function PeraWalletRedirectModal({onClose}: PeraWalletRedirectModalProps) {
  const {logo, name, main_color} = getPeraWalletAppMeta();

  useEffect(() => {
    const peraWalletDeepLink = window.open(generatePeraWalletAppDeepLink());

    if (peraWalletDeepLink) {
      peraWalletDeepLink.addEventListener("load", onClose);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={"pera-wallet-connect-modal"}
      style={{"--pera-wallet-main-color": main_color} as React.CSSProperties}>
      <div className={"pera-wallet-connect-modal__body"}>
        <div className={"pera-wallet-connect-modal__body__header"}>
          <div className={"pera-wallet-connect-modal__logo"}>
            <img src={logo} />
          </div>

          <button
            className={
              "pera-wallet-connect-button pera-wallet-connect-modal__close-button"
            }
            onClick={onClose}>
            <img src={CloseIcon} />
          </button>
        </div>

        <a
          onClick={handleCloseRedirectModal}
          className={"pera-wallet-redirect-modal__launch-pera-wallet-button"}
          href={generatePeraWalletAppDeepLink()}
          rel={"noopener noreferrer"}
          target={"_blank"}>
          {`Launch ${name}`}
        </a>
      </div>
    </div>
  );

  function handleCloseRedirectModal() {
    onClose();
  }
}

export default PeraWalletRedirectModal;
