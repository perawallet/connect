import {getPeraWalletAppMeta} from "../../../util/peraWalletUtils";
import {
  PERA_WALLET_CONNECT_MODAL_ID,
  removeModalWrapperFromDOM
} from "../../peraWalletConnectModalUtils";
import styles from "./_pera-wallet-connect-modal-pending-message.scss";

const peraWalletConnectModalPendingMessageTemplate = document.createElement("template");

peraWalletConnectModalPendingMessageTemplate.innerHTML = `
  <div class="pera-wallet-connect-modal-pending-message-section">
    <div class="pera-wallet-connect-modal-pending-message">
    <img id="pera-wallet-connect-modal-pending-message-section-pera-icon" alt={"Pera Wallet Logo"} />
    <div class="pera-wallet-connect-modal-pending-message__text">
      Please wait while we connect you to Pera Wallet
    </div>
  </div>

  <button
    id="pera-wallet-connect-modal-pending-message-cancel-button"
    class="pera-wallet-button pera-wallet-connect-modal-pending-message__cancel-button">
      Cancel
  </button>
  </div>
`;

export class PeraWalletConnectModalPendingMessageSection extends HTMLElement {
  constructor() {
    const {logo} = getPeraWalletAppMeta();

    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      const styleSheet = document.createElement("style");

      styleSheet.textContent = styles;

      this.shadowRoot.append(
        peraWalletConnectModalPendingMessageTemplate.content.cloneNode(true),
        styleSheet
      );
      this.shadowRoot
        .getElementById("pera-wallet-connect-modal-pending-message-section-pera-icon")
        ?.setAttribute("src", logo);

      const cancelButton = this.shadowRoot?.getElementById(
        "pera-wallet-connect-modal-pending-message-cancel-button"
      );

      cancelButton?.addEventListener("click", () => {
        this.onClose();
      });
    }
  }

  onClose() {
    removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
  }
}
