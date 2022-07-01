import "./_pera-wallet-connect-modal-desktop-mode.scss";

import React, {useEffect, useRef} from "react";

import Accordion from "../../component/accordion/Accordion";
import {getPeraConnectModalAccordionData} from "../../peraWalletConnectModalUtils";
import PeraWalletConnectModalInformationSection from "../../section/information/PeraWalletConnectModalInformationSection";
import appTellerManager from "../../../util/network/teller/appTellerManager";

interface PeraWalletConnectModalDesktopModeProps {
  uri: string;
}

function PeraWalletConnectModalDesktopMode({
  uri
}: PeraWalletConnectModalDesktopModeProps) {
  const peraWalletWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    appTellerManager.setupListener({
      onReceiveMessage
    });

    return () => appTellerManager.close();
  }, []);

  return (
    <div className={"pera-wallet-connect-modal-desktop-mode"}>
      <PeraWalletConnectModalInformationSection />

      <Accordion items={getPeraConnectModalAccordionData({uri, onWebWalletConnect})} />
    </div>
  );

  function onReceiveMessage(event: MessageEvent) {
    console.log(peraWalletWindowRef, event.data);

    peraWalletWindowRef.current?.close();
  }

  function onWebWalletConnect() {
    // TODO: fix the url
    peraWalletWindowRef.current = window.open("https://localhost:3000/connect");

    if (peraWalletWindowRef.current) {
      appTellerManager.sendMessage({
        message: {
          type: "CONNECT",

          meta: {
            url: window.location.origin,
            title: document.title
          }
        },

        targetWindow: peraWalletWindowRef.current
      });
    }
  }
}

export default PeraWalletConnectModalDesktopMode;
