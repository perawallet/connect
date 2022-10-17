import {isMobile} from "../util/device/deviceUtils";
import {isSmallScreen} from "../util/screen/screenSizeUtils";
import {
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_MODAL_CLASSNAME
} from "./peraWalletConnectModalUtils";
import styles from "./_pera-wallet-modal.scss";

const peraWalletConnectModal = document.createElement("template");
const peraWalletConnectModalClassNames = isMobile()
  ? `${PERA_WALLET_MODAL_CLASSNAME} ${PERA_WALLET_MODAL_CLASSNAME}--mobile`
  : `${PERA_WALLET_MODAL_CLASSNAME} ${PERA_WALLET_MODAL_CLASSNAME}--desktop`;

export class PeraWalletConnectModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      const styleSheet = document.createElement("style");

      styleSheet.textContent = styles;

      if (isSmallScreen() && isMobile()) {
        peraWalletConnectModal.innerHTML = `
        <div class="${peraWalletConnectModalClassNames}">
          <div class="pera-wallet-modal__body" part="body">
            <pera-wallet-modal-header modal-id="${PERA_WALLET_CONNECT_MODAL_ID}"></pera-wallet-modal-header/>
      
            <pera-wallet-modal-touch-screen-mode id="pera-wallet-modal-desktop-mode" uri="${this.getAttribute(
              "uri"
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
              )}"></pera-wallet-modal-desktop-mode>
            </div>
          </div>
        `;

        this.shadowRoot.append(
          peraWalletConnectModal.content.cloneNode(true),
          styleSheet
        );
      }

      const peraWalletDesktopMode = this.shadowRoot.getElementById(
        "pera-wallet-modal-desktop-mode"
      );
      const URI = this.getAttribute("uri");
      const network = this.getAttribute("network");

      if (URI && peraWalletDesktopMode) {
        peraWalletDesktopMode.setAttribute("uri", URI);
      }

      if (network && peraWalletDesktopMode) {
        peraWalletDesktopMode.setAttribute("network", network);
      }
    }
  }
}
