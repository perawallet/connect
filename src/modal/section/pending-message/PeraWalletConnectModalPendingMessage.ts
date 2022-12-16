import HelpIcon from "../../../asset/icon/Help.svg";
import SendIcon from "../../../asset/icon/Send.svg";

import "@lottiefiles/lottie-player";
import {getPeraWalletAppMeta} from "../../../util/peraWalletUtils";
import {
  PERA_WALLET_CONNECT_MODAL_ID,
  removeModalWrapperFromDOM
} from "../../peraWalletConnectModalUtils";
import styles from "./_pera-wallet-connect-modal-pending-message.scss";
import {isIOS} from "../../../util/device/deviceUtils";
import {
  CONNECT_AUDIO_URL,
  CONNECT_TIMEOUT_INTERVAL
} from "./util/peraWalletConnectModalPendingMessageConstants";

const {logo} = getPeraWalletAppMeta();
const peraWalletConnectModalPendingMessageTemplate = document.createElement("template");

peraWalletConnectModalPendingMessageTemplate.innerHTML = `
  <div class="pera-wallet-connect-modal-pending-message-section">
    <div class="pera-wallet-connect-modal-pending-message">
      <lottie-player
          src="https://gist.githubusercontent.com/yigiterdev/ea981d663e8c68726a0cdbbdd701a154/raw/c341095c9c42b8ea4d1dfec46fd6b18cdeaa43ff/PeraLoaderAnimationLottie.json"
          class="pera-wallet-connect-modal-pending-message__animation-wrapper"
          autoplay
          loop
      ></lottie-player>
     
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

  <div id="pera-wallet-connect-modal-pending-message-audio-wrapper"></div>
`;

const peraWalletConnectTryAgainView = `
  <div class="pera-wallet-connect-modal-pending-message--try-again-view">
    <div>
      <img src="${logo}" alt="Pera Wallet Logo" />

      <h1 class="pera-wallet-connect-modal-pending-message--try-again-view__title">
        Couldn’t establish connection
      </h1>

      <p class="pera-wallet-connect-modal-pending-message--try-again-view__description">
        Having issues? Before trying again, make sure to read the support article below and apply the possible solutions.
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
        Close & Try Again
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
    }
  }

  connectedCallback() {
    const cancelButton = this.shadowRoot?.getElementById(
      "pera-wallet-connect-modal-pending-message-cancel-button"
    );

    cancelButton?.addEventListener("click", () => {
      this.onClose();
    });

    this.addAudioForConnection();

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

        const tryAgainButton = this.shadowRoot?.getElementById(
          "pera-wallet-connect-modal-pending-message-try-again-button"
        );

        tryAgainButton?.addEventListener("click", () => {
          this.onClose();
        });
      }
    }, CONNECT_TIMEOUT_INTERVAL);
  }

  onClose() {
    removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
  }

  addAudioForConnection() {
    const shouldUseSound = this.getAttribute("should-use-sound");

    if (shouldUseSound === "true" && isIOS()) {
      const connectAudioWrapper = this.shadowRoot?.getElementById(
        "pera-wallet-connect-modal-pending-message-audio-wrapper"
      );

      const audio = document.createElement("audio");

      audio.src = CONNECT_AUDIO_URL;
      audio.autoplay = true;
      audio.loop = true;

      connectAudioWrapper?.appendChild(audio);
    }
  }
}
