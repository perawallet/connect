import "./_pera-wallet-modal.scss";

import React, {useEffect, useState} from "react";

import {useIsSmallScreen} from "../util/screen/useMediaQuery";
import PeraWalletConnectModalTouchScreenMode from "./mode/touch-screen/PeraWalletConnectModalTouchScreenMode";
import PeraWalletConnectModalDesktopMode from "./mode/desktop/PeraWalletConnectModalDesktopMode";
import useSetDynamicVhValue from "../util/screen/useSetDynamicVhValue";
import {detectBrowser} from "../util/device/deviceUtils";
import PeraWalletModalHeader from "./header/PeraWalletModalHeader";
import {
  PERA_CONNECT_MODAL_VIEWS,
  PERA_WALLET_MODAL_CLASSNAME
} from "./peraWalletConnectModalUtils";

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
  const [view, setView] = useState<PERA_CONNECT_MODAL_VIEWS>("default");

  useSetDynamicVhValue();

  useEffect(() => {
    if (browser === "Chrome" && view === "default") {
      onWebWalletConnect();
    }
  }, [onWebWalletConnect, browser, view]);

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
            view={view}
            handleSetView={handleSetView}
          />
        )}
      </div>
    </div>
  );

  function handleSetView() {
    if (view === "default") {
      setView("download-pera");
    } else if (view === "download-pera") {
      setView("default");
    }
  }
}

export default PeraWalletConnectModal;
