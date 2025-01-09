import {PeraWalletModalHeader} from "./modal/header/PeraWalletModalHeader";
import {PeraWalletDownloadQRCode} from "./modal/mode/desktop/download-qr-code/PeraWalletDownloadQRCode";
import {PeraWalletModalDesktopMode} from "./modal/mode/desktop/PeraWalletConnectModalDesktopMode";
import {PeraWalletModalTouchScreenMode} from "./modal/mode/touch-screen/PeraWalletModalTouchScreenMode";
import {PeraWalletConnectModal} from "./modal/PeraWalletConnectModal";
import {PeraWalletRedirectModal} from "./modal/redirect/PeraWalletRedirectModal";
import {PeraWalletConnectModalInformationSection} from "./modal/section/information/PeraWalletConnectModalInformationSection";
import {PeraWalletConnectModalPendingMessageSection} from "./modal/section/pending-message/PeraWalletConnectModalPendingMessage";
import {PeraWalletSignTxnToast} from "./modal/sign-toast/PeraWalletSignTxnToast";
import {PeraWalletSignTxnModal} from "./modal/sign-txn/PeraWalletSignTxnModal";

import "./util/screen/setDynamicVhValue";

function defineCustomElement(name: string, element: CustomElementConstructor) {
  if (!window.customElements.get(name)) {
    window.customElements.define(name, element);
  }
}
defineCustomElement("pera-wallet-connect-modal", PeraWalletConnectModal);
defineCustomElement("pera-wallet-modal-desktop-mode", PeraWalletModalDesktopMode);
defineCustomElement("pera-wallet-modal-header", PeraWalletModalHeader);
defineCustomElement(
  "pera-wallet-modal-touch-screen-mode",
  PeraWalletModalTouchScreenMode
);
defineCustomElement("pera-wallet-redirect-modal", PeraWalletRedirectModal);
defineCustomElement(
  "pera-wallet-connect-modal-information-section",
  PeraWalletConnectModalInformationSection
);
defineCustomElement(
  "pera-wallet-connect-modal-pending-message-section",
  PeraWalletConnectModalPendingMessageSection
);
defineCustomElement("pera-wallet-sign-txn-toast", PeraWalletSignTxnToast);
defineCustomElement("pera-wallet-sign-txn-modal", PeraWalletSignTxnModal);
defineCustomElement("pera-wallet-download-qr-code", PeraWalletDownloadQRCode);
