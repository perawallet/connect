import "./_pera-wallet-connect-modal-desktop-mode.scss";

import React, {useEffect, useRef} from "react";

import Accordion from "../../component/accordion/Accordion";
import {getPeraConnectModalAccordionData} from "../../peraWalletConnectModalUtils";
import PeraWalletConnectModalInformationSection from "../../section/information/PeraWalletConnectModalInformationSection";
import appTellerManager, {
  PeraTeller
} from "../../../util/network/teller/appTellerManager";
import {saveWalletDetailsToStorage} from "../../../util/storage/storageUtils";
import {getMetaInfo} from "../../../util/dom/domUtils";

interface PeraWalletConnectModalDesktopModeProps {
  uri: string;
  onClose: () => void;
  resolvePromise?: (accounts: string[]) => void;
}

function PeraWalletConnectModalDesktopMode({
  uri,
  onClose,
  resolvePromise
}: PeraWalletConnectModalDesktopModeProps) {
  const peraWalletWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    appTellerManager.setupListener({
      onReceiveMessage
    });

    return () => appTellerManager.close();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={"pera-wallet-connect-modal-desktop-mode"}>
      <PeraWalletConnectModalInformationSection />

      <Accordion items={getPeraConnectModalAccordionData({uri, onWebWalletConnect})} />
    </div>
  );

  function onReceiveMessage(event: MessageEvent<TellerMessage<PeraTeller>>) {
    console.log("onReceiveMessage", event.data);

    if (resolvePromise && event.data.message.type === "CONNECT_CALLBACK") {
      const accounts = [event.data.message.data.address];

      saveWalletDetailsToStorage(accounts, "pera-wallet-web");

      resolvePromise(accounts);
      onClose();
    }

    peraWalletWindowRef.current?.close();
  }

  function onWebWalletConnect() {
    // TODO: fix the url
    peraWalletWindowRef.current = window.open("https://localhost:3001/connect");

    if (peraWalletWindowRef.current) {
      appTellerManager.sendMessage({
        message: {
          type: "CONNECT",
          data: getMetaInfo()
        },

        targetWindow: peraWalletWindowRef.current
      });
    }
  }
}

export default PeraWalletConnectModalDesktopMode;
