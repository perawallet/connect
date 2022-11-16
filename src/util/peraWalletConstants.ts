import {isAndroid} from "./device/deviceUtils";
import {PeraWalletNetwork} from "./peraWalletTypes";

const PERA_WALLET_APP_DEEP_LINK = isAndroid() ? "algorand://" : "algorand-wc://";
const PERA_DOWNLOAD_URL = "https://perawallet.app/download/";

function getPeraWebWalletURL(webWalletURL: string, network: PeraWalletNetwork) {
  if (network === "dev") {
    return {
      ROOT: "https://localhost:3001",
      CONNECT: "https://localhost:3001/connect",
      TRANSACTION_SIGN: "https://localhost:3001/transaction/sign"
    };
  }

  return {
    ROOT: `https://${webWalletURL}`,
    CONNECT: `https://${webWalletURL}/connect`,
    TRANSACTION_SIGN: `https://${webWalletURL}/transaction/sign`
  };
}

export {PERA_WALLET_APP_DEEP_LINK, getPeraWebWalletURL, PERA_DOWNLOAD_URL};
