import PeraRedirectIcon from "../../asset/icon/PeraRedirectIcon.svg";

import {generatePeraWalletAppDeepLink} from "../../util/peraWalletUtils";
import {
  PERA_WALLET_REDIRECT_MODAL_ID,
  removeModalWrapperFromDOM
} from "../peraWalletConnectModalUtils";
import styles from "./_pera-wallet-redirect-modal.scss";

const peraWalletRedirectModalTemplate = document.createElement("template");

peraWalletRedirectModalTemplate.innerHTML = `
  <div class="pera-wallet-modal pera-wallet-modal--mobile">
    <div class="pera-wallet-modal__body">
      <pera-wallet-modal-header modal-id="${PERA_WALLET_REDIRECT_MODAL_ID}"></pera-wallet-modal-header/>

      <div class="pera-wallet-redirect-modal">
        <div class="pera-wallet-redirect-modal__content">
          <img src="${PeraRedirectIcon}" />

          <h1 class="pera-wallet-redirect-modal__content__title">
            Can't Launch Pera
          </h1>

          <p class="pera-wallet-redirect-modal__content__description">
            We couldn't redirect you to Pera Wallet automatically. Please try again.
          </p>

          <p class="pera-wallet-redirect-modal__content__install-pera-text">
            Don't have Pera Wallet installed yet?
            <br />
            
            <a
              id="pera-wallet-redirect-modal-download-pera-link"
              class="pera-wallet-redirect-modal__content__install-pera-text__link"
              href="https://perawallet.app/download/"
              rel="noopener noreferrer"
              target="_blank">
              Tap here to install.
            </a>
          </p>
        </div>

        <a
          id="pera-wallet-redirect-modal-launch-pera-link"
          class="pera-wallet-redirect-modal__launch-pera-wallet-button"
          rel="noopener noreferrer"
          target="_blank">
          Launch Pera Wallet
        </a>
      </div>
    </div>
  </div>
`;

export class PeraWalletRedirectModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      const styleSheet = document.createElement("style");

      styleSheet.textContent = styles;

      this.shadowRoot.append(
        peraWalletRedirectModalTemplate.content.cloneNode(true),
        styleSheet
      );

      const downloadPeraLink = this.shadowRoot?.getElementById(
        "pera-wallet-redirect-modal-download-pera-link"
      );

      downloadPeraLink?.addEventListener("click", () => {
        this.onClose();
      });

      const launchPeraLink = this.shadowRoot?.getElementById(
        "pera-wallet-redirect-modal-launch-pera-link"
      );

      launchPeraLink?.addEventListener("click", () => {
        this.onClose();
        window.open(generatePeraWalletAppDeepLink(), "_blank");
      });
    }
  }

  connectedCallback() {
    const peraWalletDeepLink = window.open(generatePeraWalletAppDeepLink(), "_blank");

    if (peraWalletDeepLink && !peraWalletDeepLink.closed) {
      this.onClose();
    }
  }

  onClose() {
    removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
  }
}
