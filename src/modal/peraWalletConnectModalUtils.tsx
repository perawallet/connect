import PeraWalletLogoCircleYellow from "../asset/icon/PeraWallet--circle-yellow.svg";
import PeraWalletLogoCircleBlack from "../asset/icon/PeraWallet--circle-black.svg";

import React from "react";
import ReactDOM from "react-dom";
import {QRCode} from "react-qrcode-logo";

import PeraWalletConnectModal from "./PeraWalletConnectModal";
import PeraWalletRedirectModal from "./redirect/PeraWalletRedirectModal";
import {AccordionData} from "./component/accordion/util/accordionTypes";
import PeraWalletConnectError from "../util/PeraWalletConnectError";

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
 * @param {rejectPromise} rejectPromise - the reject callback of the PeraWalletConnect.connect method
 * @param {string} uri - uri to be passed to Pera Wallet via deeplink
 * @param {VoidFunction} closeCallback - callback to be called when user closes the modal
 * @returns {void}
 */
function openPeraWalletConnectModal(rejectPromise?: (error: any) => void) {
  return (uri: string, closeCallback: VoidFunction) => {
    const wrapper = createModalWrapperOnDOM(PERA_WALLET_CONNECT_MODAL_ID);

    ReactDOM.render(
      <PeraWalletConnectModal onClose={handleClosePeraWalletConnectModal} uri={uri} />,
      wrapper
    );

    function handleClosePeraWalletConnectModal() {
      removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
      closeCallback();

      if (rejectPromise) {
        rejectPromise(
          new PeraWalletConnectError(
            {
              type: "SESSION_CONNECT"
            },
            "The action canceled by the user."
          )
        );
      }
    }
  };
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

function getPeraConnectModalAccordionData(uri: string): AccordionData[] {
  return [
    {
      id: "scan-to-connect",
      title: "Scan to connect",
      description: (
        <>
          <p className={"pera-wallet-connect-modal-desktop-mode__accordion__description"}>
            {"Scan the QR code below with Pera Wallet's scan feature."}
          </p>

          <QRCode
            id={"pera-wallet-connect-modal-desktop-mode__qr-code"}
            logoImage={PeraWalletLogoCircleYellow}
            value={uri}
            qrStyle={"dots"}
            quietZone={20}
            logoWidth={48}
            logoHeight={48}
            // eslint-disable no-magic-numbers
            eyeRadius={5}
          />
        </>
      )
    },
    {
      id: "new-to-pera-wallet",
      title: "New to Pera Wallet?",
      description: (
        <>
          <p className={"pera-wallet-connect-modal-desktop-mode__accordion__description"}>
            {"Scan the QR code with your phone to download Pera Wallet."}
          </p>

          <QRCode
            id={"pera-wallet-connect-modal-desktop-mode__qr-code"}
            logoImage={PeraWalletLogoCircleBlack}
            value={"https://perawallet.app/download/"}
            qrStyle={"dots"}
            quietZone={20}
            logoWidth={48}
            logoHeight={48}
            // eslint-disable no-magic-numbers
            eyeRadius={5}
          />
        </>
      )
    }
  ];
}

export {getPeraConnectModalAccordionData};

export {
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_REDIRECT_MODAL_ID,
  openPeraWalletConnectModal,
  openPeraWalletRedirectModal,
  removeModalWrapperFromDOM
};
