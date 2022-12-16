import CloseIcon from "../../asset/icon/Close--small.svg";

import "@lottiefiles/lottie-player";
import styles from "./_pera-wallet-sign-txn-toast.scss";
import {
  PERA_WALLET_SIGN_TXN_TOAST_ID,
  removeModalWrapperFromDOM
} from "../peraWalletConnectModalUtils";

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
      <lottie-player
          src="https://gist.githubusercontent.com/yigiterdev/e82b7253b774dc6e6f33cb2e1d5affc1/raw/d45f1dc977e2275d7d44e726e15a7245695f6aed/signtxnAnimation.json"
          style="width:368;height:368" 
          class="pera-wallet-sign-txn-toast__content__lottie-animation"
          autoplay
          loop
      ></lottie-player>

      <p class="pera-wallet-sign-txn-toast__content__description">
        Please launch <b>Pera Wallet</b> on your iOS or Android device to sign this transaction.
      </p>
    </div>
  </div>
`;

export class PeraWalletSignTxnToast extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      const styleSheet = document.createElement("style");

      styleSheet.textContent = styles;

      this.shadowRoot.append(
        peraWalletSignTxnToastTemplate.content.cloneNode(true),
        styleSheet
      );

      const closeButton = this.shadowRoot.getElementById(
        "pera-wallet-sign-txn-toast-close-button"
      );

      closeButton?.addEventListener("click", () => {
        removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);
      });
    }
  }
}
