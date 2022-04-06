import React from "react";
import ReactDOM from "react-dom";

import PeraWalletConnectModal from "./PeraWalletConnectModal";

// The ID of the wrapper element for PeraWalletConnectModal
const PERA_WALLET_CONNECT_MODAL_ID = "pera-wallet-connect-modal-wrapper";

/**
 * @returns {HTMLDivElement} wrapper element for PeraWalletConnectModal
 */
function createModalWrapperOnDOM() {
  const wrapper = document.createElement("div");

  wrapper.setAttribute("id", PERA_WALLET_CONNECT_MODAL_ID);

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
  const wrapper = createModalWrapperOnDOM();

  ReactDOM.render(
    <PeraWalletConnectModal onClose={handleClosePeraWalletConnectModal} uri={uri} />,
    wrapper
  );

  function handleClosePeraWalletConnectModal() {
    closePeraWalletConnectModal();
    closeCallback();
  }
}

/**
 * Removes the PeraWalletConnectModal from the DOM.
 * @returns {void}
 */
function closePeraWalletConnectModal() {
  const wrapper = document.getElementById(PERA_WALLET_CONNECT_MODAL_ID);

  if (wrapper) {
    wrapper.remove();
  }
}

export {openPeraWalletConnectModal, closePeraWalletConnectModal};
