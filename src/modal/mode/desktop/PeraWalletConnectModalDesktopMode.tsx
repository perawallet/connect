import "./_pera-wallet-connect-modal-desktop-mode.scss";

import ArrowRight from "../../../asset/icon/Right.svg";
import PeraWalletLogoCircleBlack from "../../../asset/icon/PeraWallet--circle-black.svg";

import React, {useState} from "react";
import {QRCode} from "react-qrcode-logo";

import Accordion from "../../component/accordion/Accordion";
import {getPeraConnectModalAccordionData} from "../../peraWalletConnectModalUtils";
import PeraWalletConnectModalInformationSection from "../../section/information/PeraWalletConnectModalInformationSection";

interface PeraWalletConnectModalDesktopModeProps {
  uri: string;
  onWebWalletConnect: () => void;
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
            onWebWalletConnect,
            handleSetView
          })}
        />
      )}

      {view === "download-pera" && (
        <div>
          <button
            className={"pera-wallet-connect-modal-desktop-mode__back-button"}
            onClick={handleSetView}>
            <img
              className={
                "pera-wallet-connect-modal-desktop-mode__back-button__arrow-icon"
              }
              src={ArrowRight}
            />

            {"Back"}
          </button>

          <div className={"pera-wallet-connect-modal-desktop-mode__download-pera-view"}>
            <p
              className={
                "pera-wallet-connect-modal-desktop-mode__accordion__description"
              }>
              {"Scan the QR code with your phone to download Pera Wallet."}
            </p>

            <QRCode
              id={"pera-wallet-connect-modal-desktop-mode__qr-code"}
              logoImage={PeraWalletLogoCircleBlack}
              value={"https://perawallet.app/download/"}
              qrStyle={"dots"}
              quietZone={20}
              logoWidth={48}
              logoHeight={48}
              // eslint-disable no-magic-numbers
              eyeRadius={5}
            />
          </div>
        </div>
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
