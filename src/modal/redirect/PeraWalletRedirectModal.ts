import PeraRedirectIcon from "../../asset/icon/PeraRedirectIcon.svg";

import "./_pera-wallet-redirect-modal.scss";

import {generatePeraWalletAppDeepLink} from "../../util/peraWalletUtils";

const peraWalletRedirectModalTemplate = document.createElement("template");

peraWalletRedirectModalTemplate.innerHTML = `
<div class="pera-wallet-connect-modal">
  <div class="pera-wallet-connect-modal__body">
    <div class="pera-wallet-wallet-redirect-modal">
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
            onClick={handleCloseRedirectModal}
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
        onClick={handleCloseRedirectModal}
        class="pera-wallet-redirect-modal__launch-pera-wallet-button"
        rel="noopener noreferrer"
        target="_blank">
        Launch Pera Wallet
      </a>
    </div>
  </div>
</div>
`;

class PeraWalletRedirectModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      this.shadowRoot.appendChild(
        peraWalletRedirectModalTemplate.content.cloneNode(true)
      );

      const downloadPeraLink = this.shadowRoot?.getElementById(
        "pera-wallet-redirect-modal-download-pera-link"
      );

      downloadPeraLink?.addEventListener("click", () => {
        this.getAttribute("onClose");
      });

      const launchPeraLink = this.shadowRoot?.getElementById(
        "pera-wallet-redirect-modal-launch-pera-link"
      );

      launchPeraLink?.addEventListener("click", () => {
        this.getAttribute("onClose");
      });

      launchPeraLink?.setAttribute("href", generatePeraWalletAppDeepLink());
    }
  }

  connectedCallback() {
    const peraWalletDeepLink = window.open(generatePeraWalletAppDeepLink());

    if (peraWalletDeepLink) {
      peraWalletDeepLink.addEventListener("load", () => {
        this.getAttribute("onClose");
      });
    }
  }
}

window.customElements.define("pera-wallet-redirect-modal", PeraWalletRedirectModal);
