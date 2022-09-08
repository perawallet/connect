import "./_pera-wallet-connect-modal-desktop-mode.scss";

import React, {useState} from "react";

import Accordion from "../../component/accordion/Accordion";
import {getPeraConnectModalAccordionData} from "../../peraWalletConnectModalUtils";
import PeraWalletConnectModalInformationSection from "../../section/information/PeraWalletConnectModalInformationSection";
import PeraWalletConnectModalDownloadPeraView from "./view/download-pera/PeraWalletConnectModalDownloadPeraView";

interface PeraWalletConnectModalDesktopModeProps {
  uri: string;
  onWebWalletConnect: VoidFunction;
}

type PERA_CONNECT_MODAL_VIEWS = "default" | "download-pera";

function PeraWalletConnectModalDesktopMode({
  uri,
  onWebWalletConnect
}: PeraWalletConnectModalDesktopModeProps) {
  const [view, setView] = useState<PERA_CONNECT_MODAL_VIEWS>("default");

  return (
    <div className={"pera-wallet-connect-modal-desktop-mode"}>
      <PeraWalletConnectModalInformationSection />

      {view === "default" && (
        <Accordion
          items={getPeraConnectModalAccordionData({
            uri,
            handleSetView,
            onWebWalletConnect
          })}
        />
      )}

      {view === "download-pera" && (
        <PeraWalletConnectModalDownloadPeraView handleSetView={handleSetView} />
      )}
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

export default PeraWalletConnectModalDesktopMode;
