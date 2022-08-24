import CloseIcon from "../asset/icon/Close.svg";
import CloseIconDark from "../asset/icon/Close--dark.svg";
import PeraConnectIcon from "../asset/icon/PeraConnect.svg";

import "./_pera-wallet-modal.scss";

import React, {useEffect} from "react";

import {useIsSmallScreen} from "../util/screen/useMediaQuery";
import PeraWalletConnectModalTouchScreenMode from "./mode/touch-screen/PeraWalletConnectModalTouchScreenMode";
import PeraWalletConnectModalDesktopMode from "./mode/desktop/PeraWalletConnectModalDesktopMode";
import useSetDynamicVhValue from "../util/screen/useSetDynamicVhValue";
import {detectBrowser} from "../util/device/deviceUtils";

interface PeraWalletConnectModalProps {
  uri: string;
  onClose: VoidFunction;
  onWebWalletConnect: VoidFunction;
}

function PeraWalletConnectModal({
  uri,
  onClose,
  onWebWalletConnect
}: PeraWalletConnectModalProps) {
  const isSmallScreen = useIsSmallScreen();
  const browser = detectBrowser();

  useSetDynamicVhValue();

  useEffect(() => {
    if (browser === "chrome") {
      onWebWalletConnect();
    }
  }, [onWebWalletConnect, browser]);

  return (
    <div className={"pera-wallet-modal"}>
      <div className={"pera-wallet-modal__body"}>
        <div className={"pera-wallet-modal__body__header"}>
          {!isSmallScreen && (
            <div className={"pera-wallet-modal__body__header__brand"}>
              <img src={PeraConnectIcon} />

              {"Pera Connect"}
            </div>
          )}

          <button
            className={"pera-wallet-button pera-wallet-modal__close-button"}
            onClick={onClose}>
            <img
              className={"pera-wallet-modal__close-button__close-icon"}
              src={isSmallScreen ? CloseIconDark : CloseIcon}
            />
          </button>
        </div>

        {isSmallScreen ? (
          <PeraWalletConnectModalTouchScreenMode uri={uri} />
        ) : (
          <PeraWalletConnectModalDesktopMode
            uri={uri}
            onWebWalletConnect={onWebWalletConnect}
          />
        )}
      </div>
    </div>
  );
}

export default PeraWalletConnectModal;
