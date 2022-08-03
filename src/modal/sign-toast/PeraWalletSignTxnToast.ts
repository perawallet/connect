import CloseIcon from "../../asset/icon/Close--small.svg";

import "./_pera-wallet-sign-txn-toast.scss";

import Lottie from "lottie-web";

const peraWalletSignTxnToastTemplate = document.createElement("template");

peraWalletSignTxnToastTemplate.innerHTML = `
<div class="pera-wallet-sign-txn-toast">
  <div class="pera-wallet-sign-txn-toast__header">
    <button
      id="pera-wallet-sign-txn-toast-close-button"
      class="pera-wallet-sign-txn-toast__header__close-button">
      <img src="${CloseIcon}" />
    </button>
  </div>

  <div class="pera-wallet-sign-txn-toast__content">
    <div id="pera-wallet-sign-txn-toast-lottie-animation" style="width:368;height:368" class="pera-wallet-sign-txn-toast__content__lottie-animation"></div>

    <p class="pera-wallet-sign-txn-toast__content__description">
      Please launch <b>Pera Wallet</b> on your iOS or Android device to sign this transaction.
    </p>
  </div>
</div>
`;

class PeraWalletSignTxnToast extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      this.shadowRoot.appendChild(peraWalletSignTxnToastTemplate.content.cloneNode(true));

      const closeButton = this.shadowRoot.getElementById(
        "pera-wallet-sign-txn-toast-close-button"
      );

      closeButton?.addEventListener("click", () => {
        this.getAttribute("onClose");
      });

      Lottie.loadAnimation({
        container: this.shadowRoot.getElementById(
          "pera-wallet-sign-txn-toast-lottie-animation"
        )!,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "./lotties/Animation.json"
      });
    }
  }
}

window.customElements.define("pera-wallet-sign-txn-toast", PeraWalletSignTxnToast);
