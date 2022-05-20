import CloseIcon from "../asset/icon/Close.svg";

import "./_pera-wallet-modal.scss";
import "./_pera-wallet-connect-modal.scss";

import React, {useState} from "react";
import QRCode from "react-qr-code";

import {isLargeScreen} from "../util/screen/screenSizeUtils";
import {isMobile} from "../util/device/deviceUtils";
import {
  generatePeraWalletConnectDeepLink,
  getPeraWalletAppMeta
} from "../util/peraWalletUtils";

interface PeraWalletConnectModalProps {
  uri: string;
  onClose: () => void;
}

function PeraWalletConnectModal({uri, onClose}: PeraWalletConnectModalProps) {
  const {logo, name, main_color} = getPeraWalletAppMeta();
  const [isQRCodeVisible, setQRCodeVisibility] = useState(!isMobile());
  const [isSpinnerVisible, setSpinnerVisibility] = useState(false);

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

        {isSpinnerVisible ? renderPendingMessage() : renderActionButtons()}

        {isSpinnerVisible && (
          <button
            className={
              "pera-wallet-connect-button pera-wallet-connect-modal__cancel-button"
            }
            onClick={handleCancelClick}>
            {"Cancel"}
          </button>
        )}
      </div>
    </div>
  );

  function renderActionButtons() {
    return (
      <>
        {isMobile() && (
          <a
            onClick={handleToggleSpinnerVisibility}
            className={"pera-wallet-connect-modal__launch-pera-wallet-button"}
            href={generatePeraWalletConnectDeepLink(uri)}
            rel={"noopener noreferrer"}
            target={"_blank"}>
            {`Launch ${name}`}
          </a>
        )}

        {isQRCodeVisible && renderQRCode()}

        {!isQRCodeVisible && (
          <button
            className={
              "pera-wallet-connect-button pera-wallet-connect-modal__display-qr-code-button"
            }
            onClick={handleToggleQRCodeVisibility}>
            {"Display QR Code"}
          </button>
        )}
      </>
    );
  }

  function renderQRCode() {
    return (
      <div className={"pera-wallet-connect-modal__qr-code"}>
        <p className={"pera-wallet-connect-modal__qr-code__text"}>
          {`Scan QR code with ${name}`}
        </p>
        <QRCode
          // eslint-disable-next-line no-magic-numbers
          size={isLargeScreen() ? 392 : 240}
          value={uri}
        />
      </div>
    );
  }

  function renderPendingMessage() {
    return (
      <div className={"pera-wallet-connect-modal__pending-message"}>
        <div className={"pera-wallet-connect-modal__pending-message__logo"}>
          <img src={logo} />
        </div>

        <div className={"pera-wallet-connect-modal__pending-message__text"}>
          {`Please wait while we connect you to ${name}...`}
        </div>
      </div>
    );
  }

  function handleToggleSpinnerVisibility() {
    setSpinnerVisibility(!isSpinnerVisible);
  }

  function handleToggleQRCodeVisibility() {
    setQRCodeVisibility(!isQRCodeVisible);
  }

  function handleCancelClick() {
    onClose();
  }
}

export default PeraWalletConnectModal;
