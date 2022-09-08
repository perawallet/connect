import "./_pera-wallet-connect-modal-desktop-mode.scss";

import React from "react";

import Accordion from "../../component/accordion/Accordion";
import {
  getPeraConnectModalAccordionData,
  PERA_CONNECT_MODAL_VIEWS
} from "../../peraWalletConnectModalUtils";
import PeraWalletConnectModalInformationSection from "../../section/information/PeraWalletConnectModalInformationSection";
import PeraWalletConnectModalDownloadPeraView from "./view/download-pera/PeraWalletConnectModalDownloadPeraView";

interface PeraWalletConnectModalDesktopModeProps {
  uri: string;
  onWebWalletConnect: VoidFunction;
  view: PERA_CONNECT_MODAL_VIEWS;
  handleSetView: VoidFunction;
}

function PeraWalletConnectModalDesktopMode({
  uri,
  onWebWalletConnect,
  view,
  handleSetView
}: PeraWalletConnectModalDesktopModeProps) {
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
}

export default PeraWalletConnectModalDesktopMode;
