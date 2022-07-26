import "./_pera-wallet-connect-modal-desktop-mode.scss";

import React, {useEffect} from "react";

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
    if (resolvePromise && event.data.message.type === "CONNECT_CALLBACK") {
      const accounts = [event.data.message.data.address];

      saveWalletDetailsToStorage(accounts, "pera-wallet-web");

      resolvePromise(accounts);
      onClose();
    }

    document.getElementById("pera-wallet-iframe")?.remove();
  }

  function onWebWalletConnect() {
    const peraWalletIframe = document.createElement("iframe");

    peraWalletIframe.setAttribute("id", "pera-wallet-iframe");
    // TODO: fix the url
    peraWalletIframe.setAttribute("src", "https://localhost:3000/connect");

    document.body.appendChild(peraWalletIframe);

    if (peraWalletIframe.contentWindow) {
      console.log(peraWalletIframe.contentWindow);

      appTellerManager.sendMessage({
        message: {
          type: "CONNECT",
          data: getMetaInfo()
        },

        origin: "https://localhost:3000/connect",
        targetWindow: peraWalletIframe.contentWindow
      });
    }
  }
}

export default PeraWalletConnectModalDesktopMode;
