import CloseIcon from "../asset/icon/Close.svg";
import CloseIconDark from "../asset/icon/Close--dark.svg";
import PeraConnectIcon from "../asset/icon/PeraConnect.svg";

import "./_pera-wallet-modal.scss";

import React, {useEffect} from "react";

import {useIsSmallScreen} from "../util/screen/useMediaQuery";
import PeraWalletConnectModalTouchScreenMode from "./mode/touch-screen/PeraWalletConnectModalTouchScreenMode";
import PeraWalletConnectModalDesktopMode from "./mode/desktop/PeraWalletConnectModalDesktopMode";
import useSetDynamicVhValue from "../util/screen/useSetDynamicVhValue";

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

  useSetDynamicVhValue();

  useEffect(() => {
    onWebWalletConnect();
  }, [onWebWalletConnect]);

  return (
    <div className={"pera-wallet-connect-modal"}>
      <div className={"pera-wallet-connect-modal__body"}>
        <div className={"pera-wallet-connect-modal__body__header"}>
          {!isSmallScreen && (
            <div className={"pera-wallet-connect-modal__body__header__brand"}>
              <img src={PeraConnectIcon} />

              {"Pera Connect"}
            </div>
          )}

          <button
            className={
              "pera-wallet-connect-button pera-wallet-connect-modal__close-button"
            }
            onClick={onClose}>
            <img
              className={"pera-wallet-connect-modal__close-button__close-icon"}
              src={isSmallScreen ? CloseIconDark : CloseIcon}
            />
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
