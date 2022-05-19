import React from "react";
import ReactDOM from "react-dom";

import PeraWalletConnectModal from "./PeraWalletConnectModal";
import PeraWalletRedirectModal from "./redirect/PeraWalletRedirectModal";

// The ID of the wrapper element for PeraWalletConnectModal
const PERA_WALLET_CONNECT_MODAL_ID = "pera-wallet-connect-modal-wrapper";

// The ID of the wrapper element for PeraWalletRedirectModal
const PERA_WALLET_REDIRECT_MODAL_ID = "pera-wallet-redirect-modal-wrapper";

/**
 * @returns {HTMLDivElement} wrapper element for PeraWalletConnectModal
 */
function createModalWrapperOnDOM(modalId: string) {
  const wrapper = document.createElement("div");

  wrapper.setAttribute("id", modalId);

  document.body.appendChild(wrapper);

  return wrapper;
}

/**
 * Creates a PeraWalletConnectModal instance and renders it on the DOM.
 *
 * @param {string} uri - uri to be passed to Pera Wallet via deeplink
 * @param {VoidFunction} closeCallback - callback to be called when user closes the modal
 * @returns {void}
 */
function openPeraWalletConnectModal(uri: string, closeCallback: VoidFunction) {
  const wrapper = createModalWrapperOnDOM(PERA_WALLET_CONNECT_MODAL_ID);

  ReactDOM.render(
    <PeraWalletConnectModal onClose={handleClosePeraWalletConnectModal} uri={uri} />,
    wrapper
  );

  function handleClosePeraWalletConnectModal() {
    removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
    closeCallback();
  }
}

/**
 * Creates a PeraWalletRedirectModal instance and renders it on the DOM.
 *
 * @returns {void}
 */
function openPeraWalletRedirectModal() {
  const wrapper = createModalWrapperOnDOM(PERA_WALLET_REDIRECT_MODAL_ID);

  ReactDOM.render(
    <PeraWalletRedirectModal onClose={handleClosePeraWalletRedirectModal} />,
    wrapper
  );

  function handleClosePeraWalletRedirectModal() {
    removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
  }
}

/**
 * Removes the PeraWalletConnectModal from the DOM.
 * @returns {void}
 */
function removeModalWrapperFromDOM(modalId: string) {
  const wrapper = document.getElementById(modalId);

  if (wrapper) {
    wrapper.remove();
  }
}

export {
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_REDIRECT_MODAL_ID,
  openPeraWalletConnectModal,
  openPeraWalletRedirectModal,
  removeModalWrapperFromDOM
};
