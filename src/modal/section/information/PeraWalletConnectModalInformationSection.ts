import ShieldTickIcon from "../../../asset/icon/ShieldTick.svg";
import LayerIcon from "../../../asset/icon/Layer.svg";
import NoteIcon from "../../../asset/icon/Note.svg";
import PeraWalletWithText from "../../../asset/icon/PeraWallet--with-text.svg";
import PeraWalletLogo from "../../../asset/icon/PeraWallet.svg";

import {isSmallScreen} from "../../../util/screen/screenSizeUtils";
import styles from "./_pera-wallet-connect-modal-information-section.scss";
import {isMobile} from "../../../util/device/deviceUtils";

const peraWalletConnectModalInformationSectionTemplate =
  document.createElement("template");
const informationSectionClassNames = isMobile()
  ? "pera-wallet-connect-modal-information-section pera-wallet-connect-modal-information-section--mobile"
  : "pera-wallet-connect-modal-information-section pera-wallet-connect-modal-information-section--desktop";

peraWalletConnectModalInformationSectionTemplate.innerHTML = `
  <section class="${informationSectionClassNames}">
    <img
      id="pera-wallet-connect-modal-information-section-pera-icon"
      src="${PeraWalletLogo}"
      class="pera-wallet-connect-modal-information-section__pera-icon"
      alt="Pera Wallet Logo"
    />

    <h1 id="pera-wallet-connect-modal-information-section-connect-pera-mobile" class="pera-wallet-connect-modal-information-section__connect-pera-title">
        Connect to Pera Wallet
    </h1>

    <h1 class="pera-wallet-connect-modal-information-section__title">
      Simply the best Algorand wallet.
    </h1>

    <h2 id="pera-wallet-connect-modal-information-section-secondary-title" class="pera-wallet-connect-modal-information-section__secondary-title">
      Features
    </h2>

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

export class PeraWalletConnectModalInformationSection extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode: "open"});

    const isCompactMode =
      document
        .querySelector("pera-wallet-connect-modal")
        ?.getAttribute("compact-mode") === "true";

    if (this.shadowRoot && ((!isCompactMode && !isMobile()) || isMobile())) {
      const styleSheet = document.createElement("style");

      styleSheet.textContent = styles;

      this.shadowRoot.append(
        peraWalletConnectModalInformationSectionTemplate.content.cloneNode(true),
        styleSheet
      );

      if (isSmallScreen() && isMobile()) {
        this.shadowRoot
          .getElementById("pera-wallet-connect-modal-information-section-title")
          ?.setAttribute("style", "display: none;");
      } else {
        this.shadowRoot
          .getElementById("pera-wallet-connect-modal-information-section-pera-icon")
          ?.setAttribute("src", PeraWalletWithText);
        this.shadowRoot
          .getElementById(
            "pera-wallet-connect-modal-information-section-connect-pera-mobile"
          )
          ?.setAttribute("style", "display: none;");
      }
    }
  }
}
