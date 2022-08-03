import "./_pera-wallet-connect-modal-pending-message.scss";

import {getPeraWalletAppMeta} from "../../../util/peraWalletUtils";

const peraWalletConnectModalPendingMessageTemplate = document.createElement("template");

peraWalletConnectModalPendingMessageTemplate.innerHTML = `
<div class="pera-wallet-connect-modal-pending-message">
  <img id="pera-wallet-connect-modal-pending-message-section-pera-icon" alt={"Pera Wallet Logo"} />

  <div class="pera-wallet-connect-modal-pending-message__text">
    Please wait while we connect you to Pera Wallet
  </div>
</div>

<button
  id="pera-wallet-connect-modal-pending-message-cancel-button"
  class="pera-wallet-connect-button pera-wallet-connect-modal-pending-message__cancel-button">
    Cancel
</button>
`;

class PeraWalletConnectModalPendingMessageSection extends HTMLElement {
  constructor() {
    const {logo} = getPeraWalletAppMeta();

    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      this.shadowRoot.appendChild(
        peraWalletConnectModalPendingMessageTemplate.content.cloneNode(true)
      );
      this.shadowRoot
        .getElementById("pera-wallet-connect-modal-pending-message-section-pera-icon")
        ?.setAttribute("src", logo);

      const cancelButton = this.shadowRoot?.getElementById(
        "pera-wallet-connect-modal-pending-message-cancel-button"
      );

      cancelButton?.addEventListener("click", () => {
        this.getAttribute("onClose");
      });
    }
  }
}

window.customElements.define(
  "pera-wallet-connect-modal-pending-message-section",
  PeraWalletConnectModalPendingMessageSection
);
