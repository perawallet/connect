import {isMobile} from "../util/device/deviceUtils";
import {isSmallScreen} from "../util/screen/screenSizeUtils";
import {
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_MODAL_CLASSNAME
} from "./peraWalletConnectModalUtils";
import styles from "./_pera-wallet-modal.scss";

const peraWalletConnectModal = document.createElement("template");
let peraWalletConnectModalClassNames = isMobile()
  ? `${PERA_WALLET_MODAL_CLASSNAME} ${PERA_WALLET_MODAL_CLASSNAME}--mobile`
  : `${PERA_WALLET_MODAL_CLASSNAME} ${PERA_WALLET_MODAL_CLASSNAME}--desktop`;

export class PeraWalletConnectModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      const styleSheet = document.createElement("style");

      styleSheet.textContent = styles;

      const isCompactMode = this.getAttribute("compact-mode") === "true";

      if (isCompactMode) {
        peraWalletConnectModalClassNames = `${peraWalletConnectModalClassNames} ${PERA_WALLET_MODAL_CLASSNAME}--compact`;
      }

      if (isSmallScreen() && isMobile()) {
        peraWalletConnectModal.innerHTML = `
        <div class="${peraWalletConnectModalClassNames}">
          <div class="pera-wallet-modal__body" part="body">
            <pera-wallet-modal-header modal-id="${PERA_WALLET_CONNECT_MODAL_ID}"></pera-wallet-modal-header/>
      
            <pera-wallet-modal-touch-screen-mode uri="${this.getAttribute(
              "uri"
            )}" should-use-sound="${this.getAttribute(
          "should-use-sound"
        )}"></pera-wallet-modal-touch-screen-mode>
          </div>
        </div>
      `;

        this.shadowRoot.append(
          peraWalletConnectModal.content.cloneNode(true),
          styleSheet
        );
      } else {
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
        )}"></pera-wallet-modal-desktop-mode>
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
}
