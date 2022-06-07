import PeraWalletLogoCircle from "../../asset/icon/PeraWallet--circle.svg";
import PeraDownloadQRCode from "../../asset/img/PeraDownloadQRCode.png";

import React from "react";
import {QRCode} from "react-qrcode-logo";

import {AccordionData} from "../component/accordion/util/accordionTypes";

function getPeraConnectModalAccordionData(uri: string) {
  return [
    {
      id: "connect-to-pera",
      title: "Scan to connect",
      description: (
        <>
          <p className={"pera-wallet-connect-modal__content__accordion__description"}>
            {"Scan the QR code below with Pera Wallet's scan feature."}
          </p>
          <QRCode
            id={"pera-wallet-connect-modal__qr-code"}
            logoImage={PeraWalletLogoCircle}
            value={uri}
            qrStyle={"dots"}
            quietZone={20}
            logoWidth={48}
            logoHeight={48}
            // eslint-disable no-magic-numbers
            eyeRadius={5}
          />
        </>
      )
    },
    {
      id: "new-to-pera-wallet",
      title: "New to Pera Wallet?",
      description: (
        <>
          <p className={"pera-wallet-connect-modal__content__accordion__description"}>
            {"Scan the QR code with your phone to download Pera Wallet."}
          </p>

          <img
            className={"pera-wallet-connect-modal__content__pera-download-qr-code"}
            src={PeraDownloadQRCode}
          />
        </>
      )
    }
  ] as AccordionData[];
}

export {getPeraConnectModalAccordionData};
