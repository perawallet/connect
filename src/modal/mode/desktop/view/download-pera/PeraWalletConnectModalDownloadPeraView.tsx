import ArrowRight from "../../../../../asset/icon/Right.svg";
import PeraWalletLogoCircleBlack from "../../../../../asset/icon/PeraWallet--circle-black.svg";
import AppStoreIcon from "../../../../../asset/icon/AppStoreIcon.svg";
import PlayStoreIcon from "../../../../../asset/icon/PlayStoreIcon.svg";
import DownloadIcon from "../../../../../asset/icon/Download.svg";

import "./_pera-wallet-connect-modal-download-pera-view.scss";

import React from "react";
import {QRCode} from "react-qrcode-logo";

interface PeraWalletConnectModalDownloadPeraViewProps {
  handleSetView: VoidFunction;
}
function PeraWalletConnectModalDownloadPeraView({
  handleSetView
}: PeraWalletConnectModalDownloadPeraViewProps) {
  return (
    <div>
      <button
        className={"pera-wallet-connect-modal-download-pera-view__back-button"}
        onClick={handleSetView}>
        <img
          className={
            "pera-wallet-connect-modal-download-pera-view__back-button__arrow-icon"
          }
          src={ArrowRight}
        />

        {"Back"}
      </button>

      <div className={"pera-wallet-connect-modal-download-pera-view"}>
        <h1 className={"pera-wallet-connect-modal-download-pera-view__title"}>
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

        <div className={"pera-wallet-connect-modal-download-pera-view__footer"}>
          <a
            href={"https://apps.apple.com/us/app/algorand-wallet/id1459898525"}
            target={"_blank"}
            rel={"noreferrer"}>
            <img src={AppStoreIcon} alt={"App Store icon"} />
          </a>

          <a
            href={"https://play.google.com/store/apps/details?id=com.algorand.android"}
            target={"_blank"}
            rel={"noreferrer"}>
            <img src={PlayStoreIcon} alt={"Play Store icon"} />
          </a>

          <a
            className={"pera-wallet-connect-modal-download-pera-view__footer__button"}
            href={
              "https://perawallet.s3-eu-west-3.amazonaws.com/android-releases/app-pera-prod-release-bitrise-signed.apk"
            }
            target={"_blank"}
            rel={"noreferrer"}>
            <img src={DownloadIcon} alt={"Download icon"} />

            {"Download APK File"}
          </a>
        </div>
      </div>
    </div>
  );
}

export default PeraWalletConnectModalDownloadPeraView;
