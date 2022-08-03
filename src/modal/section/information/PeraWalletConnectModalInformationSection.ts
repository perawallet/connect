import "./_pera-wallet-modal-information-section.scss";

import ShieldTickIcon from "../../../asset/icon/ShieldTick.svg";
import LayerIcon from "../../../asset/icon/Layer.svg";
import NoteIcon from "../../../asset/icon/Note.svg";
import PeraWalletWithText from "../../../asset/icon/PeraWallet--with-text.svg";

import {isSmallScreen} from "../../../util/screen/screenSizeUtils";
import {getPeraWalletAppMeta} from "../../../util/peraWalletUtils";

const peraWalletConnectModalInformationSectionTemplate =
  document.createElement("template");

peraWalletConnectModalInformationSectionTemplate.innerHTML = `
<section class="pera-wallet-connect-modal-information-section">
  <img
    id="pera-wallet-connect-modal-information-section-pera-icon"
    class="pera-wallet-connect-modal-information-section__pera-icon"
    alt="Pera Wallet Logo"
  />

  <h1 class"pera-wallet-connect-modal-information-section__title>
    Simply the best Algorand wallet
  </h1>

  <h2 id="pera-wallet-connect-modal-information-section-secondary-title" class="pera-wallet-connect-modal-information-section__secondary-title">
    Features
  </h2>p

  <ul>
    <li class="pera-wallet-connect-modal-information-section__features-item">
      <div class="pera-wallet-connect-modal-information-section__features-item__icon-wrapper">
        <img src="${LayerIcon}" alt="Layer Icon" />
      </div>

      <p
        class="pera-wallet-connect-modal-information-section__features-item__description">
        Connect to any Algorand dApp securely
      </p>
    </li>

    <li class="pera-wallet-connect-modal-information-section__features-item">
      <div
        class="pera-wallet-connect-modal-information-section__features-item__icon-wrapper">
        <img src="${ShieldTickIcon}" alt="Tick Icon" />
      </div>

      <p
        class="pera-wallet-connect-modal-information-section__features-item__description">
        Your private keys are safely stored locally
      </p>
    </li>

    <li class="pera-wallet-connect-modal-information-section__features-item">
      <div
        class="pera-wallet-connect-modal-information-section__features-item__icon-wrapper">
        <img src="${NoteIcon}" alt="Note Icon" />
      </div>

      <p
        class="pera-wallet-connect-modal-information-section__features-item__description">
        View NFTs, buy and swap crypto and more
      </p>
    </li>
  </ul>
</section>
`;

class PeraWalletConnectModalInformationSection extends HTMLElement {
  constructor() {
    const {logo} = getPeraWalletAppMeta();

    super();
    this.attachShadow({mode: "open"});

    if (this.shadowRoot) {
      this.shadowRoot.appendChild(
        peraWalletConnectModalInformationSectionTemplate.content.cloneNode(true)
      );

      if (isSmallScreen()) {
        this.shadowRoot
          .getElementById("pera-wallet-connect-modal-information-section-title")!
          .setAttribute("style", "display: none;");

        this.shadowRoot
          .getElementById("pera-wallet-connect-modal-information-section-pera-icon")
          ?.setAttribute("src", logo);
      }

      if (!isSmallScreen()) {
        this.shadowRoot
          .getElementById(
            "pera-wallet-connect-modal-information-section-secondary-title"
          )!
          .setAttribute("style", "display: none;");

        this.shadowRoot
          .getElementById("pera-wallet-connect-modal-information-section-pera-icon")
          ?.setAttribute("src", PeraWalletWithText);
      }
    }
  }
}

window.customElements.define(
  "pera-wallet-connect-modal-information-section",
  PeraWalletConnectModalInformationSection
);
