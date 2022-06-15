import "./_pera-wallet-connect-modal-touch-screen-mode.scss";

import React, {useState} from "react";

import {
  generatePeraWalletConnectDeepLink,
  getPeraWalletAppMeta
} from "../../../util/peraWalletUtils";
import PeraWalletConnectModalInformationSection from "../../section/information/PeraWalletConnectModalInformationSection";
import PeraWalletConnectModalPendingMessage from "../../section/pending-message/PeraWalletConnectModalPendingMessage";

interface PeraWalletConnectModalTouchScreenModeProps {
  uri: string;
}
function PeraWalletConnectModalTouchScreenMode({
  uri
}: PeraWalletConnectModalTouchScreenModeProps) {
  const [view, setView] = useState("default" as "default" | "launching-app");
  const {name} = getPeraWalletAppMeta();

  return (
    <div
      className={`pera-wallet-connect-modal-touch-screen-mode ${
        view === "launching-app"
          ? "pera-wallet-connect-modal-touch-screen-mode--pending-message-view"
          : ""
      }`}>
      {view === "launching-app" ? (
        <PeraWalletConnectModalPendingMessage onClose={handleChangeModalView} />
      ) : (
        <>
          <PeraWalletConnectModalInformationSection />

          <div>
            <a
              onClick={handleChangeModalView}
              className={
                "pera-wallet-connect-modal-touch-screen-mode__launch-pera-wallet-button"
              }
              href={generatePeraWalletConnectDeepLink(uri)}
              rel={"noopener noreferrer"}
              target={"_blank"}>
              {`Launch ${name}`}
            </a>

            <div
              className={"pera-wallet-connect-modal-touch-screen-mode__new-to-pera-box"}>
              <p
                className={
                  "pera-wallet-connect-modal-touch-screen-mode__new-to-pera-box__text"
                }>
                {"New to Pera?"}
              </p>
            </div>

            <a
              href={"https://perawallet.app/download/"}
              className={
                "pera-wallet-connect-modal-touch-screen-mode__install-pera-wallet-button"
              }
              rel={"noopener noreferrer"}
              target={"_blank"}>
              {`Install ${name}`}
            </a>
          </div>
        </>
      )}
    </div>
  );

  function handleChangeModalView() {
    if (view === "default") {
      setView("launching-app");
    } else if (view === "launching-app") {
      setView("default");
    }
  }
}

export default PeraWalletConnectModalTouchScreenMode;
