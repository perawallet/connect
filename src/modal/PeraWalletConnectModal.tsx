import CloseIcon from "../asset/icon/Close.svg";
import CloseIconDark from "../asset/icon/Close--dark.svg";

import "./_pera-wallet-modal.scss";

import React from "react";

import {useIsSmallScreen} from "../util/screen/useMediaQuery";
import PeraWalletConnectModalTouchScreenMode from "./mode/touch-screen/PeraWalletConnectModalTouchScreenMode";
import PeraWalletConnectModalDesktopMode from "./mode/desktop/PeraWalletConnectModalDesktopMode";
import useSetDynamicVhValue from "../util/screen/useSetDynamicVhValue";

interface PeraWalletConnectModalProps {
  uri: string;
  onClose: () => void;
}

function PeraWalletConnectModal({uri, onClose}: PeraWalletConnectModalProps) {
  const isSmallScreen = useIsSmallScreen();

  useSetDynamicVhValue();

  return (
    <div className={"pera-wallet-connect-modal"}>
      <div className={"pera-wallet-connect-modal__body"}>
        <div className={"pera-wallet-connect-modal__body__header"}>
          <button
            className={
              "pera-wallet-connect-button pera-wallet-connect-modal__close-button"
            }
            onClick={onClose}>
            <img src={isSmallScreen ? CloseIconDark : CloseIcon} />
          </button>
        </div>

        {isSmallScreen ? (
          <PeraWalletConnectModalTouchScreenMode uri={uri} />
        ) : (
          <PeraWalletConnectModalDesktopMode uri={uri} />
        )}
      </div>
    </div>
  );
}

export default PeraWalletConnectModal;
