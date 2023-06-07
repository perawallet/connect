import PeraConnectIcon from "../../asset/icon/PeraConnect.svg";
import CloseIcon from "../../asset/icon/Close.svg";
import CloseIconDark from "../../asset/icon/Close--dark.svg";

import styles from "./_pera-wallet-modal-header.scss";
import {isSmallScreen} from "../../util/screen/screenSizeUtils";
import {isMobile} from "../../util/device/deviceUtils";
import {
  PERA_WALLET_REDIRECT_MODAL_ID,
  removeModalWrapperFromDOM
} from "../peraWalletConnectModalUtils";

const peraWalletModalHeader = document.createElement("template");

const headerClassName = isMobile()
  ? "pera-wallet-modal-header pera-wallet-modal-header--mobile"
  : "pera-wallet-modal-header pera-wallet-modal-header--desktop";

peraWalletModalHeader.innerHTML = `
  <div class="${headerClassName}">
      ${
        isSmallScreen() && isMobile()
          ? ""
          : `<div class="pera-wallet-modal-header__brand">
              <img src="${PeraConnectIcon}" />

              <div class="pera-wallet-modal-header__brand-text">
                <span>Pera Connect</span>

                <span class="pera-wallet-modal-header__version-number">PERA_CONNECT_VERSION</span>
              </div>
            </div>
            `
      } 

      <button
        id="pera-wallet-modal-header-close-button"
        class="pera-wallet-button pera-wallet-modal-header__close-button">
        <img
          class="pera-wallet-modal-header__close-button__close-icon"
          src="${isSmallScreen() && isMobile() ? CloseIconDark : CloseIcon}"
        />
      </button>
    </div>
`;

export class PeraWalletModalHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      const styleSheet = document.createElement("style");

      styleSheet.textContent = styles;

      this.shadowRoot.append(peraWalletModalHeader.content.cloneNode(true), styleSheet);

      this.onClose();
    }
  }

  onClose() {
    const closeButton = this.shadowRoot?.getElementById(
      "pera-wallet-modal-header-close-button"
    );
    const modalId = this.getAttribute("modal-id");

    if (closeButton && modalId === PERA_WALLET_REDIRECT_MODAL_ID) {
      closeButton.addEventListener("click", () => {
        removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
      });
    }
  }
}
