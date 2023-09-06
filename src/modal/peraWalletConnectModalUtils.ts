import PeraWalletConnectError from "../util/PeraWalletConnectError";
import {waitForElementCreatedAtShadowDOM} from "../util/dom/domUtils";

export type PERA_CONNECT_MODAL_VIEWS = "default" | "download-pera";

export interface PeraWalletModalConfig {
  isWebWalletAvailable: boolean;
  shouldDisplayNewBadge: boolean;
  shouldUseSound: boolean;
  promoteMobile?: boolean;
  compactMode?: boolean;
}

// The ID of the wrapper element for PeraWalletConnectModal
const PERA_WALLET_CONNECT_MODAL_ID = "pera-wallet-connect-modal-wrapper";

// The ID of the wrapper element for PeraWalletRedirectModal
const PERA_WALLET_REDIRECT_MODAL_ID = "pera-wallet-redirect-modal-wrapper";

// The ID of the wrapper element for PeraWalletSignTxnToast
const PERA_WALLET_SIGN_TXN_TOAST_ID = "pera-wallet-sign-txn-toast-wrapper";

// The ID of the wrapper element for PeraWalletSignTxnModal
const PERA_WALLET_SIGN_TXN_MODAL_ID = "pera-wallet-sign-txn-modal-wrapper";

// The ID of the Pera wallet iframe
const PERA_WALLET_IFRAME_ID = "pera-wallet-iframe";

// The classname of Pera wallet modal
const PERA_WALLET_MODAL_CLASSNAME = "pera-wallet-modal";

// The classname of Web Wallet IFrame
const PERA_WALLET_WEB_WALLET_IFRAME_CLASSNAME =
  "pera-wallet-connect-modal-desktop-mode__web-wallet-iframe";

/**
 * Creates a Div element with the given ID and appends it to the DOM.
 * @param modalId string
 *
 * @returns HTMLDivElement
 */
function createModalWrapperOnDOM(modalId: string) {
  const wrapper = document.createElement("div");

  wrapper.setAttribute("id", modalId);

  document.body.appendChild(wrapper);

  return wrapper;
}

/**
 * Creates a modal wrapper on the DOM and renders a PeraWalletConnectModal instance on it.
 * @param modalConfig PeraWalletModalConfig
 *
 * @returns VoidFunction
 */
function openPeraWalletConnectModal(modalConfig: PeraWalletModalConfig) {
  return (uri: string) => {
    if (!document.getElementById(PERA_WALLET_CONNECT_MODAL_ID)) {
      const root = createModalWrapperOnDOM(PERA_WALLET_CONNECT_MODAL_ID);
      const newURI = `${uri}&algorand=true`;
      const {
        isWebWalletAvailable,
        shouldDisplayNewBadge,
        shouldUseSound,
        compactMode,
        promoteMobile
      } = modalConfig;

      root.innerHTML = `<pera-wallet-connect-modal uri="${newURI}" is-web-wallet-avaliable="${isWebWalletAvailable}" should-display-new-badge="${shouldDisplayNewBadge}" should-use-sound="${shouldUseSound}" compact-mode="${compactMode}" promote-mobile="${promoteMobile}"></pera-wallet-connect-modal>`;
    }
  };
}

/**
 * Adds a listener to the close button of the given modal.
 *
 * @param modalId string
 * @param onClose VoidFunction
 *
 * @returns {void}
 */
function setupPeraWalletConnectModalCloseListener(
  modalId: string,
  onClose: VoidFunction
) {
  const peraWalletConnectModalWrapper = document.getElementById(modalId);

  const peraWalletConnectModal = peraWalletConnectModalWrapper
    ?.querySelector(modalId.replace("-wrapper", ""))
    ?.shadowRoot?.querySelector(`.${PERA_WALLET_MODAL_CLASSNAME}`);

  const closeButton = peraWalletConnectModal
    ?.querySelector("pera-wallet-modal-header")
    ?.shadowRoot?.getElementById("pera-wallet-modal-header-close-button");

  closeButton?.addEventListener("click", () => {
    onClose();

    removeModalWrapperFromDOM(modalId);
  });
}

/**
 * Creates a PeraWalletRedirectModal instance and renders it on the DOM.
 *
 * @returns {void}
 */
function openPeraWalletRedirectModal() {
  const root = createModalWrapperOnDOM(PERA_WALLET_REDIRECT_MODAL_ID);

  root.innerHTML = "<pera-wallet-redirect-modal></pera-wallet-redirect-modal>";
}

/**
 * Creates a PeraWalletSignTxnModal instance and renders it on the DOM.
 *
 * @returns {Promise<Element>}
 */
function openPeraWalletSignTxnModal({isCompactMode}: {isCompactMode?: boolean}) {
  const root = createModalWrapperOnDOM(PERA_WALLET_SIGN_TXN_MODAL_ID);

  root.innerHTML = `<pera-wallet-sign-txn-modal compact-mode=${isCompactMode}></pera-wallet-sign-txn-modal>`;

  const signTxnModal = root.querySelector("pera-wallet-sign-txn-modal");

  return signTxnModal
    ? waitForElementCreatedAtShadowDOM(
        signTxnModal,
        "pera-wallet-sign-txn-modal__body__content"
      )
    : Promise.reject();
}

/**
 * Close the PeraWalletSignTxnModal instance and remove it from the DOM.
 * @param rejectPromise
 *
 * @returns {void}
 */
function closePeraWalletSignTxnModal(rejectPromise?: (error: any) => void) {
  removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_MODAL_ID);

  if (rejectPromise) {
    rejectPromise(
      new PeraWalletConnectError(
        {
          type: "SIGN_TXN_CANCELLED"
        },
        "Transaction sign is cancelled"
      )
    );
  }
}

/**
 * Creates a PeraWalletSignTxnToast instance and renders it on the DOM.
 *
 * @returns {void}
 */
function openPeraWalletSignTxnToast() {
  const root = createModalWrapperOnDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);

  root.innerHTML = "<pera-wallet-sign-txn-toast></pera-wallet-sign-txn-toast>";
}

/**
 * Close the PeraWalletSignTxnToast instance and remove it from the DOM.
 *
 * @returns {void}
 */
function closePeraWalletSignTxnToast() {
  removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);
}

/**
 * Removes the modal wrapper with given ID from the DOM.
 * @param modalId string
 *
 * @returns {void}
 */
function removeModalWrapperFromDOM(modalId: string) {
  const wrapper = document.getElementById(modalId);

  if (wrapper) {
    wrapper.remove();
  }
}

/**
 * Return the close button element in the header as a result
 * @param type "connect" | "sign-txn"
 *
 * @returns HTMLElement | null | undefined
 */
function getHeaderCloseButton(type: "connect" | "sign-txn") {
  const modalId =
    type === "connect" ? PERA_WALLET_CONNECT_MODAL_ID : PERA_WALLET_SIGN_TXN_MODAL_ID;
  const peraWalletConnectModal = document
    .getElementById(modalId)
    ?.querySelector(modalId.replace("-wrapper", ""))
    ?.shadowRoot?.querySelector(`.${PERA_WALLET_MODAL_CLASSNAME}`);
  const closeButton = peraWalletConnectModal
    ?.querySelector("pera-wallet-modal-header")
    ?.shadowRoot?.getElementById("pera-wallet-modal-header-close-button");

  return closeButton;
}

export {
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_REDIRECT_MODAL_ID,
  PERA_WALLET_SIGN_TXN_TOAST_ID,
  PERA_WALLET_SIGN_TXN_MODAL_ID,
  PERA_WALLET_MODAL_CLASSNAME,
  PERA_WALLET_WEB_WALLET_IFRAME_CLASSNAME,
  PERA_WALLET_IFRAME_ID,
  openPeraWalletConnectModal,
  setupPeraWalletConnectModalCloseListener,
  openPeraWalletRedirectModal,
  openPeraWalletSignTxnToast,
  closePeraWalletSignTxnToast,
  removeModalWrapperFromDOM,
  openPeraWalletSignTxnModal,
  closePeraWalletSignTxnModal,
  getHeaderCloseButton
};
