import HelpIcon from "../../../asset/icon/Help.svg";
import SendIcon from "../../../asset/icon/Send.svg";
import animationData from "./lotties/PeraLoaderAnimationLottie.json";

import lottie from "lottie-web";

import {getPeraWalletAppMeta} from "../../../util/peraWalletUtils";
import {
  PERA_WALLET_CONNECT_MODAL_ID,
  removeModalWrapperFromDOM
} from "../../peraWalletConnectModalUtils";
import styles from "./_pera-wallet-connect-modal-pending-message.scss";

const CONNECT_TIMEOUT_INTERVAL = 15000;

const {logo} = getPeraWalletAppMeta();
const peraWalletConnectModalPendingMessageTemplate = document.createElement("template");

peraWalletConnectModalPendingMessageTemplate.innerHTML = `
  <div class="pera-wallet-connect-modal-pending-message-section">
    <div class="pera-wallet-connect-modal-pending-message">
      <div id="pera-wallet-connect-modal-pending-message-animation-wrapper" class="pera-wallet-connect-modal-pending-message__animation-wrapper"></div>

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

const peraWalletConnectTryAgainView = `
  <div class="pera-wallet-connect-modal-pending-message--try-again-view">
    <div>
      <img src="${logo}" alt="Pera Wallet Logo" />

      <h1 class="pera-wallet-connect-modal-pending-message--try-again-view__title">
        Couldn’t establish connection
      </h1>

      <p class="pera-wallet-connect-modal-pending-message--try-again-view__description">
        Feel free to try again or have a look at the helpful articles below.
      </p>
    </div>

    <div>
      <a
        href="https://support.perawallet.app/en/article/resolving-walletconnect-issues-1tolptm/"
        target="_blank"
        rel="noopener noreferrer"
        class="pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor">
        <img
          class="pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__image"
          src="${HelpIcon}"
          alt="Help Icon"
        />

        <div>
          <div
            class="pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__title-wrapper">
            <h1
              class="pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__title">
                Resolving WalletConnect issues
            </h1>

            <img src="${SendIcon}" alt="Send Icon"/>
          </div>

          <p
            class="pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__description">
              Unfortunately there are several known issues related to WalletConnect that our team is working on. Some of these issues are related to the WalletConnect JavaScript implementation on the dApp ...
          </p>
        </div>
      </a>

      <button id="pera-wallet-connect-modal-pending-message-try-again-button" class="pera-wallet-connect-button pera-wallet-connect-modal-pending-message--try-again-view__button">
        Try Again
      </button>
    </div>
  </div>
  `;

export class PeraWalletConnectModalPendingMessageSection extends HTMLElement {
  constructor() {
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
      const tryAgainButton = this.shadowRoot?.getElementById(
        "pera-wallet-connect-modal-pending-message-try-again-button"
      );

      cancelButton?.addEventListener("click", () => {
        this.onClose();
      });

      tryAgainButton?.addEventListener("click", () => {
        this.onClose();
      });

      this.renderLottieAnimation();
    }
  }

  connectedCallback() {
    setTimeout(() => {
      peraWalletConnectModalPendingMessageTemplate.innerHTML =
        peraWalletConnectTryAgainView;

      if (this.shadowRoot) {
        const styleSheet = document.createElement("style");

        styleSheet.textContent = styles;

        this.shadowRoot.innerHTML = "";

        this.shadowRoot.append(
          peraWalletConnectModalPendingMessageTemplate.content.cloneNode(true),
          styleSheet
        );
      }
    }, CONNECT_TIMEOUT_INTERVAL);
  }

  onClose() {
    removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
  }

  renderLottieAnimation() {
    const lottieWrapper = this.shadowRoot?.getElementById(
      "pera-wallet-connect-modal-pending-message-animation-wrapper"
    );

    if (lottieWrapper) {
      lottie.loadAnimation({
        container: lottieWrapper,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData
      });
    }
  }
}
