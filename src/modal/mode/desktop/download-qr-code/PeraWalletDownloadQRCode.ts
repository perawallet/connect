import PeraWalletLogoWithBlackBackground from "../../../../asset/icon/PeraWalletWithBlackBackground.svg";

import QRCodeStyling from "qr-code-styling";

import styles from "./_pera-wallet-download-qr-code.scss";

const peraWalletDownloadQRCode = document.createElement("template");

peraWalletDownloadQRCode.innerHTML = `
  <div id="pera-wallet-download-qr-code-wrapper" class="pera-wallet-download-qr-code-wrapper"></div>  
`;

export class PeraWalletDownloadQRCode extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      const styleSheet = document.createElement("style");

      styleSheet.textContent = styles;

      this.shadowRoot.append(
        peraWalletDownloadQRCode.content.cloneNode(true),
        styleSheet
      );
    }
  }

  connectedCallback() {
    const downloadQRCode = new QRCodeStyling({
      width: 205,
      height: 205,
      type: "svg",
      data: "https://perawallet.app/download/",
      image: PeraWalletLogoWithBlackBackground,
      dotsOptions: {
        color: "#000",
        type: "extra-rounded"
      },
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 10
      },
      cornersSquareOptions: {type: "extra-rounded"},
      cornersDotOptions: {
        type: "dot"
      }
    });
    const downloadQRCodeWrapper = this.shadowRoot?.getElementById(
      "pera-wallet-download-qr-code-wrapper"
    );

    if (downloadQRCodeWrapper) {
      downloadQRCode.append(downloadQRCodeWrapper);
    }
  }
}
