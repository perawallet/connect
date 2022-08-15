import "./_pera-wallet-connect-modal-desktop-mode.scss";

import ArrowRight from "../../../asset/icon/Right.svg";
import PeraWalletLogoCircleBlack from "../../../asset/icon/PeraWallet--circle-black.svg";
import AppStoreIcon from "../../../asset/icon/AppStoreIcon.svg";
import PlayStoreIcon from "../../../asset/icon/PlayStoreIcon.svg";
import DownloadIcon from "../../../asset/icon/Download.svg";

import React, {useState} from "react";
import {QRCode} from "react-qrcode-logo";

import Accordion from "../../component/accordion/Accordion";
import {getPeraConnectModalAccordionData} from "../../peraWalletConnectModalUtils";
import PeraWalletConnectModalInformationSection from "../../section/information/PeraWalletConnectModalInformationSection";

interface PeraWalletConnectModalDesktopModeProps {
  uri: string;
}

type PERA_CONNECT_MODAL_VIEWS = "default" | "download-pera";

function PeraWalletConnectModalDesktopMode({
  uri
}: PeraWalletConnectModalDesktopModeProps) {
  const [view, setView] = useState<PERA_CONNECT_MODAL_VIEWS>("default");

  return (
    <div className={"pera-wallet-connect-modal-desktop-mode"}>
      <PeraWalletConnectModalInformationSection />

      {view === "default" && (
        <Accordion
          items={getPeraConnectModalAccordionData({
            uri,
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
            <h1
              className={
                "pera-wallet-connect-modal-desktop-mode__download-pera-view__title"
              }>
              {"Download Pera Wallet"}
            </h1>

            <QRCode
              id={"pera-wallet-connect-modal-desktop-mode__qr-code"}
              logoImage={PeraWalletLogoCircleBlack}
              value={"https://perawallet.app/download/"}
              qrStyle={"dots"}
              size={190}
              quietZone={10}
              logoWidth={64}
              logoHeight={64}
              // eslint-disable no-magic-numbers
              eyeRadius={5}
            />

            <div
              className={
                "pera-wallet-connect-modal-desktop-mode__download-pera-view__footer"
              }>
              <a
                href={"https://apps.apple.com/us/app/algorand-wallet/id1459898525"}
                target={"_blank"}
                rel={"noreferrer"}>
                <img src={AppStoreIcon} alt={"App Store icon"} />
              </a>

              <a
                href={
                  "https://play.google.com/store/apps/details?id=com.algorand.android"
                }
                target={"_blank"}
                rel={"noreferrer"}>
                <img src={PlayStoreIcon} alt={"Play Store icon"} />
              </a>

              <a
                className={
                  "pera-wallet-connect-modal-desktop-mode__download-pera-view__footer__button"
                }
                href={
                  "https://play.google.com/store/apps/details?id=com.algorand.android"
                }
                target={"_blank"}
                rel={"noreferrer"}>
                <img src={DownloadIcon} alt={"Download icon"} />

                {"Download APK File"}
              </a>
            </div>
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
