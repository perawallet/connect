import "./_pera-wallet-modal.scss";

import React, {useEffect} from "react";

import {useIsSmallScreen} from "../util/screen/useMediaQuery";
import PeraWalletConnectModalTouchScreenMode from "./mode/touch-screen/PeraWalletConnectModalTouchScreenMode";
import PeraWalletConnectModalDesktopMode from "./mode/desktop/PeraWalletConnectModalDesktopMode";
import useSetDynamicVhValue from "../util/screen/useSetDynamicVhValue";
import {detectBrowser} from "../util/device/deviceUtils";
import PeraWalletModalHeader from "./header/PeraWalletModalHeader";
import {PERA_WALLET_MODAL_CLASSNAME} from "./peraWalletConnectModalUtils";

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
    if (browser === "Chrome") {
      onWebWalletConnect();
    }
  }, [onWebWalletConnect, browser]);

  return (
    <div className={PERA_WALLET_MODAL_CLASSNAME}>
      <div className={"pera-wallet-modal__body"}>
        <PeraWalletModalHeader onClose={onClose} />

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
