import {isMobile} from "../util/device/deviceUtils";
import {
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_MODAL_CLASSNAME
} from "./peraWalletConnectModalUtils";
import styles from "./_pera-wallet-modal.scss";
import {getPublicSettings} from "../util/webview-api/webviewApi";
import {generatePeraWalletConnectDeepLink} from "../util/peraWalletUtils";

const peraWalletConnectModal = document.createElement("template");
let peraWalletConnectModalClassNames = isMobile()
  ? `${PERA_WALLET_MODAL_CLASSNAME} ${PERA_WALLET_MODAL_CLASSNAME}--mobile`
  : `${PERA_WALLET_MODAL_CLASSNAME} ${PERA_WALLET_MODAL_CLASSNAME}--desktop`;

export class PeraWalletConnectModal extends HTMLElement {
  private isWebviewChecked = false;
  private isInWebview = false;

  constructor() {
    super();
    this.attachShadow({mode: "open"});
  }

  connectedCallback() {
    if (this.shadowRoot && !this.isWebviewChecked) {
      this.checkWebviewAndRender();
    }
  }

  private async checkWebviewAndRender() {
    this.isWebviewChecked = true;

    // Only check for webview on mobile devices
    if (isMobile()) {
      try {
        // Use a shorter timeout for faster fallback
        // eslint-disable-next-line no-magic-numbers
        await getPublicSettings(2000);

        this.isInWebview = true;
      } catch {
        // If getPublicSettings fails, we're not in webview
        // Fall back to normal touch-screen mode
        this.isInWebview = false;
      }
    }

    this.render();
  }

  private render() {
    if (!this.shadowRoot) {
      return;
    }

    const styleSheet = document.createElement("style");

    styleSheet.textContent = styles;

    const isCompactMode = this.getAttribute("compact-mode") === "true";

    if (isCompactMode) {
      peraWalletConnectModalClassNames = `${peraWalletConnectModalClassNames} ${PERA_WALLET_MODAL_CLASSNAME}--compact`;
    }

    const singleAccount = this.getAttribute("single-account") === "true";
    const selectedAccount = this.getAttribute("selected-account") || undefined;

    // If we're in webview on mobile, skip touch-screen mode and trigger the deep link instead
    if (isMobile()) {
      if (this.isInWebview) {
        // Webview on mobile
        const URI = this.getAttribute("uri");

        if (URI) {
          const deepLink = generatePeraWalletConnectDeepLink(URI, {singleAccount, selectedAccount});

          window.open(deepLink, "_blank");
        }
      } else {
        // Touch-screen mode
        peraWalletConnectModal.innerHTML = `
          <div class="${peraWalletConnectModalClassNames}">
            <div class="pera-wallet-modal__body" part="body">
              <pera-wallet-modal-header modal-id="${PERA_WALLET_CONNECT_MODAL_ID}"></pera-wallet-modal-header/>
        
              <pera-wallet-modal-touch-screen-mode uri="${this.getAttribute(
          "uri"
        )}" should-use-sound="${this.getAttribute(
          "should-use-sound"
        )}" single-account="${singleAccount}" selected-account="${selectedAccount}"></pera-wallet-modal-touch-screen-mode>
            </div>
          </div>
        `;

        this.shadowRoot.append(
          peraWalletConnectModal.content.cloneNode(true),
          styleSheet
        );
      }
    } else {
      // Desktop mode
      peraWalletConnectModal.innerHTML = `
        <div class="${peraWalletConnectModalClassNames}">
          <div class="pera-wallet-modal__body">
            <pera-wallet-modal-header modal-id="${PERA_WALLET_CONNECT_MODAL_ID}"></pera-wallet-modal-header/>
      
            <pera-wallet-modal-desktop-mode id="pera-wallet-modal-desktop-mode" uri="${this.getAttribute(
        "uri"
      )}" is-web-wallet-avaliable="${this.getAttribute(
        "is-web-wallet-avaliable"
      )}" should-display-new-badge="${this.getAttribute(
        "should-display-new-badge"
      )}" compact-mode="${this.getAttribute(
        "compact-mode"
      )}" promote-mobile="${this.getAttribute(
        "promote-mobile"
      )}" single-account="${singleAccount}"
        ></pera-wallet-modal-desktop-mode>
          </div>
        </div>
      `;

      this.shadowRoot.append(
        peraWalletConnectModal.content.cloneNode(true),
        styleSheet
      );
    }
  }
}
