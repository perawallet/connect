import PeraConnectIcon from "../../asset/icon/PeraConnect.svg";
import CloseIcon from "../../asset/icon/Close.svg";
import CloseIconDark from "../../asset/icon/Close--dark.svg";

import styles from "./_pera-wallet-modal-header.scss";
import {isSmallScreen} from "../../util/screen/screenSizeUtils";
import {removeModalWrapperFromDOM} from "../peraWalletConnectModalUtils";
import {isMobile} from "../../util/device/deviceUtils";

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

              Pera Connect
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

      const closeButton = this.shadowRoot.getElementById(
        "pera-wallet-modal-header-close-button"
      );

      closeButton?.addEventListener("click", () => {
        this.onClose();
      });
    }
  }

  onClose() {
    const modalID = this.getAttribute("modal-id");

    if (modalID) {
      removeModalWrapperFromDOM(modalID);
    }
  }
}
