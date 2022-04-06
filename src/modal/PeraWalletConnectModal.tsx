import CloseIcon from "../asset/icon/Close.svg";
import PeraWalletLogo from "../asset/icon/PeraWallet.svg";

import "./_pera-wallet-connect-modal.scss";

import React, {useState} from "react";
import {Button} from "@hipo/react-ui-toolkit";
import QRCode from "react-qr-code";

import {isLargeScreen} from "../util/screen/screenSizeUtils";

interface PeraWalletConnectModalProps {
  uri: string;
  onClose: () => void;
}

function PeraWalletConnectModal({uri, onClose}: PeraWalletConnectModalProps) {
  const [isQRCodeVisible, setQRCodeVisibility] = useState(isLargeScreen());
  const [isSpinnerVisible, setSpinnerVisibility] = useState(false);

  return (
    <div className={"pera-wallet-connect-modal"}>
      <div className={"pera-wallet-connect-modal__body"}>
        <div className={"pera-wallet-connect-modal__body__header"}>
          <div className={"pera-wallet-connect-modal__logo"}>
            <PeraWalletLogo />
          </div>

          <Button
            customClassName={
              "pera-wallet-connect-button pera-wallet-connect-modal__close-button"
            }
            onClick={onClose}>
            <CloseIcon />
          </Button>
        </div>

        {isSpinnerVisible ? renderPendingMessage() : renderActionButtons()}

        {isSpinnerVisible && (
          <Button
            customClassName={
              "pera-wallet-connect-button pera-wallet-connect-modal__cancel-button"
            }
            onClick={handleToggleSpinnerVisibility}>
            {"Cancel"}
          </Button>
        )}
      </div>
    </div>
  );

  function renderActionButtons() {
    return (
      <>
        {!isLargeScreen() && (
          <a
            onClick={handleToggleSpinnerVisibility}
            className={"pera-wallet-connect-modal__launch-pera-wallet-button"}
            // TODO: Fix the deeplink for Android devices
            href={`algorand-wc://wc?uri=${encodeURIComponent(uri)}`}
            rel={"noopener noreferrer"}
            target={"_blank"}>
            {"Launch Pera Wallet"}
          </a>
        )}

        {isQRCodeVisible && renderQRCode()}

        {!isQRCodeVisible && (
          <Button
            customClassName={
              "pera-wallet-connect-button pera-wallet-connect-modal__display-qr-code-button"
            }
            onClick={handleToggleQRCodeVisibility}>
            {"Display QR Code"}
          </Button>
        )}
      </>
    );
  }

  function renderQRCode() {
    return (
      <div className={"pera-wallet-connect-modal__qr-code"}>
        <p className={"pera-wallet-connect-modal__qr-code__text"}>
          {"Scan QR code with Pera Wallet"}
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
          <PeraWalletLogo />
        </div>

        <div className={"pera-wallet-connect-modal__pending-message__text"}>
          {"Please wait while we connect you to Pera Wallet..."}
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
}

export default PeraWalletConnectModal;
