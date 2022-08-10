import "./_pera-wallet-connect-modal-desktop-mode.scss";

import React from "react";

import Accordion from "../../component/accordion/Accordion";
import {getPeraConnectModalAccordionData} from "../../peraWalletConnectModalUtils";
import PeraWalletConnectModalInformationSection from "../../section/information/PeraWalletConnectModalInformationSection";

interface PeraWalletConnectModalDesktopModeProps {
  uri: string;
  onWebWalletConnect: () => void;
}

function PeraWalletConnectModalDesktopMode({
  uri,
  onWebWalletConnect
}: PeraWalletConnectModalDesktopModeProps) {
  return (
    <div className={"pera-wallet-connect-modal-desktop-mode"}>
      <PeraWalletConnectModalInformationSection />

      <Accordion items={getPeraConnectModalAccordionData({uri, onWebWalletConnect})} />
    </div>
  );
}

export default PeraWalletConnectModalDesktopMode;
