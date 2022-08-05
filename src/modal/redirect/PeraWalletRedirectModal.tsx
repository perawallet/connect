import PeraRedirectIcon from "../../asset/icon/PeraRedirectIcon.svg";

import "../_pera-wallet-modal.scss";
import "./_pera-wallet-redirect-modal.scss";

import React from "react";

import {
  generatePeraWalletAppDeepLink,
  getPeraWalletAppMeta
} from "../../util/peraWalletUtils";
import useSetDynamicVhValue from "../../util/screen/useSetDynamicVhValue";

interface PeraWalletRedirectModalProps {
  onClose: () => void;
}

function PeraWalletRedirectModal({onClose}: PeraWalletRedirectModalProps) {
  const {name, main_color} = getPeraWalletAppMeta();

  useSetDynamicVhValue();

  return (
    <div
      className={"pera-wallet-connect-modal"}
      style={{"--pera-wallet-main-color": main_color} as React.CSSProperties}>
      <div className={"pera-wallet-connect-modal__body"}>
        <div className={"pera-wallet-wallet-redirect-modal"}>
          <div className={"pera-wallet-redirect-modal__content"}>
            <img src={PeraRedirectIcon} />

            <h1 className={"pera-wallet-redirect-modal__content__title"}>
              {"Continue on Pera"}
            </h1>

            <p className={"pera-wallet-redirect-modal__content__description"}>
              {
                "Launch Pera Wallet to securely connect your account and sign transactions."
              }
            </p>

            <p className={"pera-wallet-redirect-modal__content__install-pera-text"}>
              {"Don't have Pera Wallet installed yet?"}

              <br />

              <a
                onClick={handleCloseRedirectModal}
                className={"pera-wallet-redirect-modal__content__install-pera-text__link"}
                href={"https://perawallet.app/download/"}
                rel={"noopener noreferrer"}
                target={"_blank"}>
                {"Tap here to install."}
              </a>
            </p>
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
    </div>
  );

  function handleCloseRedirectModal() {
    onClose();
  }
}

export default PeraWalletRedirectModal;
