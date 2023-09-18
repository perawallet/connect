/* eslint-disable max-lines */
import QrIcon from "../../../asset/icon/Qr.svg";
import ArrowRight from "../../../asset/icon/Right.svg";
import ArrowLeft from "../../../asset/icon/Left.svg";
import AppStoreIcon from "../../../asset/icon/AppStoreIcon.svg";
import PlayStoreIcon from "../../../asset/icon/PlayStoreIcon.svg";
import DownloadIcon from "../../../asset/icon/Download.svg";
import PeraWalletLogoWithBlackBackground from "../../../asset/icon/PeraWalletWithBlackBackground.svg";
import PeraWebIcon from "../../../asset/icon/PeraWeb.svg";
import ChevronRightIcon from "../../../asset/icon/ChevronRight.svg";

import QRCodeStyling from "qr-code-styling";

import styles from "./_pera-wallet-connect-modal-desktop-mode.scss";
import accordionStyles from "./accordion/_pera-wallet-accordion.scss";
// import {peraWalletFlowType} from "../../../util/device/deviceUtils";

const peraWalletConnectModalDesktopMode = document.createElement("template");
const styleSheet = document.createElement("style");
const accordionStyleSheet = document.createElement("style");

styleSheet.textContent = styles;
accordionStyleSheet.textContent = accordionStyles;

function getConnectOptions(shouldPromoteMobile: boolean) {
  const webWalletOption = `
  <div id="web-wallet-option" class="pera-wallet-accordion-item ${
    shouldPromoteMobile ? "" : "pera-wallet-accordion-item--active"
  }  pera-wallet-accordion-item--web-wallet">
            <a class="pera-wallet-accordion-toggle">
              <button class="pera-wallet-accordion-toggle__button"></button>
  
              <img src="${ArrowRight}" class="pera-wallet-accordion-icon" />
  
              <div class="pera-wallet-accordion-toggle__content-with-label">
                <div class="pera-wallet-accordion-toggle__content-with-label__text">
                  Connect With
  
                  <span class="pera-wallet-accordion-toggle__bold-color">
                    Pera Web
                  </span>
                </div>
  
                <span id="pera-web-new-label" class="pera-wallet-accordion-toggle__label">NEW</span>
              </div>
            </a>
  
            <div class="pera-wallet-accordion-item__content">
              <div class="pera-wallet-connect-modal-desktop-mode__web-wallet"><div>
              
              <div
                class="pera-wallet-connect-modal-desktop-mode__web-wallet__logo-wrapper">
                <img src="${PeraWebIcon}" />
              </div>
  
              <p
                class="pera-wallet-connect-modal-desktop-mode__web-wallet__description">
                Connect with Pera Web to continue
              </p>
            </div>
  
            <button
              id="pera-wallet-connect-web-wallet-launch-button"
              class="pera-wallet-connect-modal-desktop-mode__web-wallet__launch-button">
              Launch Pera Web
  
              <img src="${ChevronRightIcon}" />
            </button>
          </div>`;

  const mobileWalletOption = `
  <div id="mobile-wallet-option" class="pera-wallet-accordion-item ${
    shouldPromoteMobile ? "pera-wallet-accordion-item--active" : ""
  }">
            <a class="pera-wallet-accordion-toggle">
            <button class="pera-wallet-accordion-toggle__button"></button>
  
              <img src="${ArrowRight}" class="pera-wallet-accordion-icon" />
  
              <div class="pera-wallet-accordion-toggle__text">
                Connect with
  
                <span class="pera-wallet-accordion-toggle__bold-color">
                  Pera Mobile
                </span>
              </div>
            </a>
  
            <div class="pera-wallet-accordion-item__content">
              <div id="pera-wallet-connect-modal-connect-qr-code" class="pera-wallet-connect-qr-code-wrapper"></div>
  
              <div class="pera-wallet-connect-modal-desktop-mode__download-pera-container">
                <p
                  class="pera-wallet-connect-modal-desktop-mode__download-pera-description">
                    Don’t have Pera Wallet app?
                </p>
  
                <button
                  id="pera-wallet-connect-modal-desktop-mode-download-pera-button"
                  class="pera-wallet-connect-modal-desktop-mode__download-pera-button">
                  <img src="${QrIcon}" alt="QR Icon" />
  
                  Download Pera Wallet
                </button>
              </div>
            </div>
          </div>`;

  return {
    mobileWalletOption: document
      .createRange()
      .createContextualFragment(mobileWalletOption),
    webWalletOption: document.createRange().createContextualFragment(webWalletOption)
  };
}

const peraWalletConnectModalDesktopModeDefaultView = `
  <div id="pera-wallet-connect-modal-desktop-mode" class="pera-wallet-connect-modal-desktop-mode pera-wallet-connect-modal-desktop-mode--default">
      <pera-wallet-connect-modal-information-section></pera-wallet-connect-modal-information-section>

      <div class="pera-wallet-connect-modal-desktop-mode__default-view"></div>
       

      <div class="pera-wallet-connect-modal-desktop-mode__download-view">
        <button
          id="pera-wallet-connect-modal-download-pera-view-back-button"
          class="pera-wallet-connect-modal-download-pera-view__back-button">
          <img
            src="${ArrowLeft}"
            alt="Back Arrow"
          />

          Back
        </button>

        <div class="pera-wallet-connect-modal-download-pera-view">
          <h1 class="pera-wallet-connect-modal-download-pera-view__title">
            Download Pera Wallet
          </h1>

          <pera-wallet-download-qr-code></pera-wallet-download-qr-code>

          <div class="pera-wallet-connect-modal-download-pera-view__footer">
            <a
              href="https://apps.apple.com/us/app/algorand-wallet/id1459898525"
              target="_blank"
              rel="noopener noreferrer">
              <img src="${AppStoreIcon}" alt="App Store icon" />
            </a>

            <a
              href="https://play.google.com/store/apps/details?id=com.algorand.android"
              target="_blank"
              rel="noopener noreferrer">
              <img src="${PlayStoreIcon}" alt="Play Store icon" />
            </a>

            <a
              class="pera-wallet-connect-modal-download-pera-view__footer__button"
              href="https://perawallet.s3-eu-west-3.amazonaws.com/android-releases/app-pera-prod-release-bitrise-signed.apk"
              target="_blank"
              rel="noopener noreferrer">
              <img src="${DownloadIcon}" alt="Download icon" />

              Download APK File
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

peraWalletConnectModalDesktopMode.innerHTML =
  peraWalletConnectModalDesktopModeDefaultView;

export class PeraWalletModalDesktopMode extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      this.shadowRoot.append(
        peraWalletConnectModalDesktopMode.content.cloneNode(true),
        styleSheet,
        accordionStyleSheet
      );

      this.shadowRoot.addEventListener("click", (event) => {
        this.handleAccordion(event as MouseEvent);
      });

      const isCompactMode = this.getAttribute("compact-mode") === "true";

      if (isCompactMode) {
        const modalDesktopMode = this.shadowRoot.getElementById(
          "pera-wallet-connect-modal-desktop-mode"
        );

        modalDesktopMode?.classList.add(
          "pera-wallet-connect-modal-desktop-mode--compact"
        );
      }

      const desktopModeDefaultView = this.shadowRoot?.querySelector(
        ".pera-wallet-connect-modal-desktop-mode__default-view"
      );
      const shouldPromoteMobile = this.getAttribute("promote-mobile") === "true";
      const {webWalletOption, mobileWalletOption} =
        getConnectOptions(shouldPromoteMobile);

      if (shouldPromoteMobile) {
        desktopModeDefaultView?.appendChild(mobileWalletOption);
        desktopModeDefaultView?.appendChild(webWalletOption);
      } else {
        desktopModeDefaultView?.appendChild(webWalletOption);
        desktopModeDefaultView?.appendChild(mobileWalletOption);
      }
    }
  }

  connectedCallback() {
    const shouldDisplayNewBadge = this.getAttribute("should-display-new-badge");
    const peraWalletNewLabel = this.shadowRoot?.getElementById("pera-web-new-label");

    if (shouldDisplayNewBadge === "false") {
      peraWalletNewLabel?.setAttribute("style", "display:none");
    }

    this.handleChangeView();

    // if (peraWalletFlowType() === "EMBEDDED" && this.shadowRoot) {
    //   const iframeWrapper = this.shadowRoot.querySelector(
    //     ".pera-wallet-connect-modal-desktop-mode__web-wallet-iframe"
    //   );

    //   if (iframeWrapper && this.getAttribute("is-web-wallet-avaliable") === "true") {
    //     // @ts-ignore ts-2339
    //     window.onWebWalletConnect(iframeWrapper);
    //   }
    // }
  }

  handleChangeView() {
    const downloadPeraButton = this.shadowRoot?.getElementById(
      "pera-wallet-connect-modal-desktop-mode-download-pera-button"
    );
    const backButton = this.shadowRoot?.getElementById(
      "pera-wallet-connect-modal-download-pera-view-back-button"
    );
    const webWalletLaunchButton = this.shadowRoot?.getElementById(
      "pera-wallet-connect-web-wallet-launch-button"
    );

    if (downloadPeraButton) {
      downloadPeraButton.addEventListener("click", () => {
        this.onClickDownload();
      });
    }

    if (backButton) {
      backButton.addEventListener("click", () => {
        this.onClickBack();
      });
    }

    if (webWalletLaunchButton) {
      webWalletLaunchButton.addEventListener("click", () => {
        this.webWalletConnect();
      });
    }

    this.renderQRCode();
    this.checkWebWalletAvaliability();
  }

  webWalletConnect() {
    if (this.getAttribute("is-web-wallet-avaliable") === "true") {
      // @ts-ignore ts-2339
      window.onWebWalletConnect();
    }
  }

  handleAccordion(event: MouseEvent) {
    if (event.target instanceof Element) {
      if (!event.target.classList.contains("pera-wallet-accordion-toggle__button"))
        return;

      if (this.shadowRoot && event.target.parentElement?.parentElement) {
        const accordionItem = event.target.parentElement?.parentElement;

        if (!accordionItem) return;

        if (accordionItem.classList.contains("pera-wallet-accordion-item--active")) {
          return;
        }

        const accordionItems = this.shadowRoot.querySelectorAll(
          ".pera-wallet-accordion-item.pera-wallet-accordion-item--active"
        );

        for (let i = 0; i < accordionItems.length; i++) {
          accordionItems[i].classList.remove("pera-wallet-accordion-item--active");
        }

        accordionItem.classList.toggle("pera-wallet-accordion-item--active");
      }
    }
  }

  renderQRCode() {
    const URI = this.getAttribute("uri");
    const isWebWalletAvailable = this.getAttribute("is-web-wallet-avaliable");
    const isCompactMode = this.getAttribute("compact-mode") === "true";

    /* eslint-disable no-magic-numbers */
    let size = isWebWalletAvailable === "false" ? 250 : 205;

    if (isCompactMode) {
      size = 190;
    }
    /* eslint-enable no-magic-numbers */

    if (URI) {
      const qrCode = new QRCodeStyling({
        width: size,
        height: size,
        type: "svg",
        data: URI,
        image: PeraWalletLogoWithBlackBackground,
        dotsOptions: {
          color: "#000",
          type: "extra-rounded"
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 8
        },
        cornersSquareOptions: {type: "extra-rounded"},
        cornersDotOptions: {
          type: "dot"
        }
      });

      const qrWrapper = this.shadowRoot?.getElementById(
        "pera-wallet-connect-modal-connect-qr-code"
      );

      if (qrWrapper) {
        qrCode.append(qrWrapper);
      }
    }
  }

  onClickDownload() {
    if (this.shadowRoot) {
      const modalDesktopMode = this.shadowRoot.getElementById(
        "pera-wallet-connect-modal-desktop-mode"
      );

      if (modalDesktopMode) {
        modalDesktopMode.classList.remove(
          "pera-wallet-connect-modal-desktop-mode--default"
        );

        modalDesktopMode.classList.add(
          "pera-wallet-connect-modal-desktop-mode--download"
        );
      }
    }
  }

  onClickBack() {
    if (this.shadowRoot) {
      const modalDesktopMode = this.shadowRoot.getElementById(
        "pera-wallet-connect-modal-desktop-mode"
      );

      if (modalDesktopMode) {
        modalDesktopMode.classList.add("pera-wallet-connect-modal-desktop-mode--default");

        modalDesktopMode.classList.remove(
          "pera-wallet-connect-modal-desktop-mode--download"
        );
      }
    }
  }

  checkWebWalletAvaliability() {
    if (this.getAttribute("is-web-wallet-avaliable") === "false") {
      const desktopModeDefaultView = this.shadowRoot?.querySelector(
        ".pera-wallet-connect-modal-desktop-mode__default-view"
      );

      desktopModeDefaultView?.classList.add(
        "pera-wallet-connect-modal-desktop-mode__default-view--web-wallet-not-avaliable"
      );
    }
  }
}
