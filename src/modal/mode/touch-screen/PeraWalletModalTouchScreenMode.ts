import {generatePeraWalletConnectDeepLink} from "../../../util/peraWalletUtils";
import styles from "./_pera-wallet-modal-touch-screen-mode.scss";

const peraWalletModalTouchScreenMode = document.createElement("template");

const touchScreenDefaultMode = `
  <div class="pera-wallet-connect-modal-touch-screen-mode">
    <pera-wallet-connect-modal-information-section></pera-wallet-connect-modal-information-section>

    <div>
      <a
        id="pera-wallet-connect-modal-touch-screen-mode-launch-pera-wallet-button"
        class="pera-wallet-connect-modal-touch-screen-mode__launch-pera-wallet-button"
        rel="noopener noreferrer"
        target="_blank">
        Launch Pera Wallet
      </a>

      <div
        class="pera-wallet-connect-modal-touch-screen-mode__new-to-pera-box">
        <p
          class="pera-wallet-connect-modal-touch-screen-mode__new-to-pera-box__text"
          >
          New to Pera?
        </p>
      </div>

      <a
        href="https://perawallet.app/download/"
        class="pera-wallet-connect-modal-touch-screen-mode__install-pera-wallet-button"
        rel="noopener noreferrer"
        target="_blank">
        Install Pera Wallet
      </a>
    </div>
  </div>
`;

export class PeraWalletModalTouchScreenMode extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});

    peraWalletModalTouchScreenMode.innerHTML = touchScreenDefaultMode;

    if (this.shadowRoot) {
      const styleSheet = document.createElement("style");

      styleSheet.textContent = styles;

      this.shadowRoot.append(
        peraWalletModalTouchScreenMode.content.cloneNode(true),
        styleSheet
      );

      const launchPeraLink = this.shadowRoot?.getElementById(
        "pera-wallet-connect-modal-touch-screen-mode-launch-pera-wallet-button"
      );
      const URI = this.getAttribute("uri");

      if (launchPeraLink && URI) {
        launchPeraLink.setAttribute("href", generatePeraWalletConnectDeepLink(URI));
        launchPeraLink.addEventListener("click", () => {
          this.onClickLaunch();
        });
      }
    }
  }

  onClickLaunch() {
    peraWalletModalTouchScreenMode.innerHTML = `
    <div class="pera-wallet-connect-modal-touch-screen-mode pera-wallet-connect-modal-touch-screen-mode--pending-message-view">
      <pera-wallet-connect-modal-pending-message-section should-use-sound="${this.getAttribute(
        "should-use-sound"
      )}"></pera-wallet-connect-modal-pending-message-section>
    </div>
  `;

    if (this.shadowRoot) {
      const styleSheet = document.createElement("style");

      styleSheet.textContent = styles;

      this.shadowRoot.innerHTML = "";

      this.shadowRoot.append(
        peraWalletModalTouchScreenMode.content.cloneNode(true),
        styleSheet
      );
    }
  }
}
