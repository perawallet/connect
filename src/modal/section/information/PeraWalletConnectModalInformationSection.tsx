import ShieldTickIcon from "../../../asset/icon/ShieldTick.svg";
import LayerIcon from "../../../asset/icon/Layer.svg";
import NoteIcon from "../../../asset/icon/Note.svg";
import PeraWalletWithText from "../../../asset/icon/PeraWallet--with-text.svg";

import "./_pera-wallet-modal-information-section.scss";

import React from "react";

import {useIsSmallScreen} from "../../../util/screen/useMediaQuery";
import {getPeraWalletAppMeta} from "../../../util/peraWalletUtils";

function PeraWalletConnectModalInformationSection() {
  const isSmallScreen = useIsSmallScreen();
  const {logo, name} = getPeraWalletAppMeta();

  return (
    <section className={"pera-wallet-connect-modal-information-section"}>
      <img
        className={"pera-wallet-connect-modal-information-section__pera-icon"}
        src={isSmallScreen ? logo : PeraWalletWithText}
        alt={"Pera Wallet Logo"}
      />

      {isSmallScreen && (
        <h1
          className={"pera-wallet-connect-modal-information-section__connect-pera-title"}>
          {`Connect to ${name}`}
        </h1>
      )}

      <h1 className={"pera-wallet-connect-modal-information-section__title"}>
        {"Simply the best Algorand wallet."}
      </h1>

      {!isSmallScreen && (
        <h2 className={"pera-wallet-connect-modal-information-section__secondary-title"}>
          {"Features"}
        </h2>
      )}

      <ul>
        <li className={"pera-wallet-connect-modal-information-section__features-item"}>
          <div
            className={
              "pera-wallet-connect-modal-information-section__features-item__icon-wrapper"
            }>
            <img src={LayerIcon} alt={"Layer Icon"} />
          </div>

          <p
            className={
              "pera-wallet-connect-modal-information-section__features-item__description"
            }>
            {"Connect to any Algorand dApp securely"}
          </p>
        </li>

        <li className={"pera-wallet-connect-modal-information-section__features-item"}>
          <div
            className={
              "pera-wallet-connect-modal-information-section__features-item__icon-wrapper"
            }>
            <img src={ShieldTickIcon} alt={"Tick Icon"} />
          </div>

          <p
            className={
              "pera-wallet-connect-modal-information-section__features-item__description"
            }>
            {"Your private keys are safely stored locally"}
          </p>
        </li>

        <li className={"pera-wallet-connect-modal-information-section__features-item"}>
          <div
            className={
              "pera-wallet-connect-modal-information-section__features-item__icon-wrapper"
            }>
            <img src={NoteIcon} alt={"Note Icon"} />
          </div>

          <p
            className={
              "pera-wallet-connect-modal-information-section__features-item__description"
            }>
            {"View NFTs, buy and swap crypto and more"}
          </p>
        </li>
      </ul>
    </section>
  );
}

export default PeraWalletConnectModalInformationSection;
