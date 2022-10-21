import "./_pera-wallet-connect-modal-pending-message.scss";

import HelpIcon from "../../../asset/icon/Help.svg";
import SendIcon from "../../../asset/icon/Send.svg";
import animationData from "./lotties/PeraLoaderAnimationLottie.json";

import React, {useEffect, useState} from "react";
import Lottie from "lottie-react";

import {getPeraWalletAppMeta} from "../../../util/peraWalletUtils";
import {
  PERA_WALLET_CONNECT_MODAL_ID,
  removeModalWrapperFromDOM
} from "../../peraWalletConnectModalUtils";

type PENDING_MESSAGE_VIEWS = "wait" | "try-again";
const TIMEOUT_INTERVAL = 30000;

function PeraWalletConnectModalPendingMessage() {
  const {name, logo} = getPeraWalletAppMeta();
  const [view, setView] = useState<PENDING_MESSAGE_VIEWS>("wait");

  useEffect(() => {
    setTimeout(() => {
      setView("try-again");
    }, TIMEOUT_INTERVAL);
  }, []);
  return (
    <>
      {view === "wait" ? (
        <div className={"pera-wallet-connect-modal-pending-message-wrapper"}>
          <div className={"pera-wallet-connect-modal-pending-message"}>
            <div
              className={"pera-wallet-connect-modal-pending-message__animation-wrapper"}>
              <Lottie animationData={animationData} />
            </div>

            <div className={"pera-wallet-connect-modal-pending-message__text"}>
              {`Please wait while we connect you to`}

              <b>{` ${name}...`}</b>
            </div>
          </div>
          <button
            className={
              "pera-wallet-connect-button pera-wallet-connect-modal-pending-message__cancel-button"
            }
            onClick={handleCancelClick}>
            {"Cancel"}
          </button>{" "}
        </div>
      ) : (
        <div className={"pera-wallet-connect-modal-pending-message--try-again-view"}>
          <div>
            <img src={logo} alt={"Pera Wallet Logo"} />

            <h1
              className={
                "pera-wallet-connect-modal-pending-message--try-again-view__title"
              }>
              {"Couldn’t establish connection"}
            </h1>

            <p
              className={
                "pera-wallet-connect-modal-pending-message--try-again-view__description"
              }>
              {
                "Having issues? Before trying again, make sure to read the support article below and apply the possible solutions."
              }
            </p>
          </div>

          <div>
            <a
              href={
                "https://support.perawallet.app/en/article/resolving-walletconnect-issues-1tolptm/"
              }
              target={"_blank"}
              rel={"noopener noreferrer"}
              className={
                "pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor"
              }>
              <img
                className={
                  "pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__image"
                }
                src={HelpIcon}
              />

              <div>
                <div
                  className={
                    "pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__title-wrapper"
                  }>
                  <h1
                    className={
                      "pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__title"
                    }>
                    {"Resolving WalletConnect issues"}
                  </h1>

                  <img src={SendIcon} />
                </div>

                <p
                  className={
                    "pera-wallet-connect-modal-pending-message--try-again-view__resolving-anchor__description"
                  }>
                  {
                    "Unfortunately there are several known issues related to WalletConnect that our team is working on. Some of these issues are related to the WalletConnect JavaScript implementation on the dApp ..."
                  }
                </p>
              </div>
            </a>

            <button
              className={
                "pera-wallet-connect-button pera-wallet-connect-modal-pending-message--try-again-view__button"
              }
              onClick={handleTryAgain}>
              {"Close & Try Again"}
            </button>
          </div>
        </div>
      )}
    </>
  );

  function handleTryAgain() {
    removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
  }

  function handleCancelClick() {
    removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
  }
}

export default PeraWalletConnectModalPendingMessage;
