import CloseIcon from "../asset/icon/Close.svg";
import CloseIconDark from "../asset/icon/Close--dark.svg";
import ConnectModalBackgroundPattern from "../asset/img/ConnectModalBackgroundPattern.png";

import "./_pera-wallet-modal.scss";
import "./_pera-wallet-connect-modal.scss";

import React, {useState} from "react";

import {isMobile} from "../util/device/deviceUtils";
import {
  generatePeraWalletConnectDeepLink,
  getPeraWalletAppMeta
} from "../util/peraWalletUtils";
import Accordion from "./component/accordion/Accordion";
import {useIsMediumScreen} from "../util/screen/useMediaQuery";
import PeraWalletConnectModalInformationSection from "./section/information/PeraWalletConnectModalInformationSection";
import PeraWalletConnectModalPendingMessage from "./section/pending-message/PeraWalletConnectModalPendingMessage";
import {getPeraConnectModalAccordionData} from "./util/peraWalletConnectModalUtils";

interface PeraWalletConnectModalProps {
  uri: string;
  onClose: () => void;
}

function PeraWalletConnectModal({uri, onClose}: PeraWalletConnectModalProps) {
  const {name} = getPeraWalletAppMeta();
  const [isQRCodeVisible] = useState(!isMobile());
  const [isSpinnerVisible, setSpinnerVisibility] = useState(false);
  const isMediumScreen = useIsMediumScreen();

  return (
    <div className={"pera-wallet-connect-modal"}>
      <div
        className={"pera-wallet-connect-modal__body"}
        style={
          {
            "--pera-connect-wallet-modal-background-pattern": `url(${ConnectModalBackgroundPattern})`
          } as React.CSSProperties
        }>
        <div className={"pera-wallet-connect-modal__body__header"}>
          <button
            className={
              "pera-wallet-connect-button pera-wallet-connect-modal__close-button"
            }
            onClick={onClose}>
            <img src={isMediumScreen ? CloseIconDark : CloseIcon} />
          </button>
        </div>

        <div
          className={`pera-wallet-connect-modal__content ${
            isSpinnerVisible
              ? "pera-wallet-connect-modal__content--pending-message-view"
              : ""
          }`}>
          {isSpinnerVisible ? (
            <PeraWalletConnectModalPendingMessage onClose={onClose} />
          ) : (
            <>
              <PeraWalletConnectModalInformationSection />

              <div>{renderActionContent()}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  function renderActionContent() {
    return (
      <>
        {isMediumScreen && (
          <>
            <a
              onClick={handleToggleSpinnerVisibility}
              className={"pera-wallet-connect-modal__launch-pera-wallet-button"}
              href={generatePeraWalletConnectDeepLink(uri)}
              rel={"noopener noreferrer"}
              target={"_blank"}>
              {`Launch ${name}`}
            </a>

            <div className={"pera-wallet-connect-modal__new-to-pera-box"}>
              <p className={"pera-wallet-connect-modal__new-to-pera-box__text"}>
                {"New to Pera?"}
              </p>
            </div>

            <a
              href={"https://perawallet.app/download/"}
              className={"pera-wallet-connect-modal__install-pera-wallet-button"}
              rel={"noopener noreferrer"}
              target={"_blank"}>
              {`Install ${name}`}
            </a>
          </>
        )}

        {isQRCodeVisible && !isMediumScreen && (
          <Accordion accordionData={getPeraConnectModalAccordionData(uri)} />
        )}
      </>
    );
  }

  function handleToggleSpinnerVisibility() {
    setSpinnerVisibility(!isSpinnerVisible);
  }
}

export default PeraWalletConnectModal;
