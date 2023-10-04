import CloseIcon from "../../asset/icon/Close--small.svg";

import Lottie from "@evanhahn/lottie-web-light";

import styles from "./_pera-wallet-sign-txn-toast.scss";
import {
  PERA_WALLET_SIGN_TXN_TOAST_ID,
  removeModalWrapperFromDOM
} from "../peraWalletConnectModalUtils";
import {SIGN_TXN_ANIMATION_URL} from "./util/peraWalletSignTxnToastContants";

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

      this.renderLottieAnimation();
    }
  }

  renderLottieAnimation() {
    const lottieWrapper = this.shadowRoot?.getElementById(
      "pera-wallet-sign-txn-toast-lottie-animation"
    );

    if (lottieWrapper) {
      Lottie.loadAnimation({
        container: lottieWrapper,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: SIGN_TXN_ANIMATION_URL
      });
    }
  }
}
