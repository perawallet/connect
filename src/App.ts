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

window.customElements.define("pera-wallet-connect-modal", PeraWalletConnectModal);
window.customElements.define(
  "pera-wallet-modal-desktop-mode",
  PeraWalletModalDesktopMode
);
window.customElements.define("pera-wallet-modal-header", PeraWalletModalHeader);
window.customElements.define(
  "pera-wallet-modal-touch-screen-mode",
  PeraWalletModalTouchScreenMode
);
window.customElements.define("pera-wallet-redirect-modal", PeraWalletRedirectModal);
window.customElements.define(
  "pera-wallet-connect-modal-information-section",
  PeraWalletConnectModalInformationSection
);
window.customElements.define(
  "pera-wallet-connect-modal-pending-message-section",
  PeraWalletConnectModalPendingMessageSection
);
window.customElements.define("pera-wallet-sign-txn-toast", PeraWalletSignTxnToast);
window.customElements.define("pera-wallet-sign-txn-modal", PeraWalletSignTxnModal);
window.customElements.define("pera-wallet-download-qr-code", PeraWalletDownloadQRCode);
