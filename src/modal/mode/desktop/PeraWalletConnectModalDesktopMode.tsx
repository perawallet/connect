import "./_pera-wallet-connect-modal-desktop-mode.scss";

import React from "react";

import Accordion from "../../component/accordion/Accordion";
import {getPeraConnectModalAccordionData} from "../../peraWalletConnectModalUtils";
import PeraWalletConnectModalInformationSection from "../../section/information/PeraWalletConnectModalInformationSection";

interface PeraWalletConnectModalDesktopModeProps {
  uri: string;
}

function PeraWalletConnectModalDesktopMode({
  uri
}: PeraWalletConnectModalDesktopModeProps) {
  return (
    <div className={"pera-wallet-connect-modal-desktop-mode"}>
      <PeraWalletConnectModalInformationSection />

      <Accordion items={getPeraConnectModalAccordionData(uri)} />
    </div>
  );
}

export default PeraWalletConnectModalDesktopMode;
