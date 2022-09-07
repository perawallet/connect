import PeraConnectIcon from "../../asset/icon/PeraConnect.svg";
import CloseIcon from "../../asset/icon/Close.svg";
import CloseIconDark from "../../asset/icon/Close--dark.svg";

import "./_pera-wallet-modal-header.scss";

import React from "react";

import {useIsSmallScreen} from "../../util/screen/useMediaQuery";

interface PeraWalletModalHeaderProps {
  onClose: VoidFunction;
}

function PeraWalletModalHeader({onClose}: PeraWalletModalHeaderProps) {
  const isSmallScreen = useIsSmallScreen();

  return (
    <div className={"pera-wallet-modal-header"}>
      {!isSmallScreen && (
        <div className={"pera-wallet-modal-header__brand"}>
          <img src={PeraConnectIcon} />

          {"Pera Connect"}
        </div>
      )}

      <button
        className={"pera-wallet-button pera-wallet-modal-header__close-button"}
        onClick={onClose}>
        <img
          className={"pera-wallet-modal-header__close-button__close-icon"}
          src={isSmallScreen ? CloseIconDark : CloseIcon}
        />
      </button>
    </div>
  );
}

export default PeraWalletModalHeader;
