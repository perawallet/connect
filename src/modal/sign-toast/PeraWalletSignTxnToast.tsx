import "./_pera-wallet-sign-txn-toast.scss";

import CloseIcon from "../../asset/icon/Close--small.svg";
import animationData from "./lotties/Animation.json";

import React from "react";
import Lottie from "lottie-react";

interface PeraWalletSignTxnToastProps {
  onClose: () => void;
}

function PeraWalletSignTxnToast({onClose}: PeraWalletSignTxnToastProps) {
  return (
    <div className={"pera-wallet-sign-txn-toast"}>
      <div className={"pera-wallet-sign-txn-toast__header"}>
        <button
          className={"pera-wallet-sign-txn-toast__header__close-button"}
          onClick={onClose}>
          <img src={CloseIcon} />
        </button>
      </div>

      <div className={"pera-wallet-sign-txn-toast__content"}>
        <Lottie
          className={"pera-wallet-sign-txn-toast__content__lottie-animation"}
          animationData={animationData}
          width={368}
          height={368}
        />

        <p className={"pera-wallet-sign-txn-toast__content__description"}>
          {"Please launch "}

          <b>{"Pera Wallet"}</b>

          {" on your iOS or Android device to sign this transaction."}
        </p>
      </div>
    </div>
  );
}

export default PeraWalletSignTxnToast;
