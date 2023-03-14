import {isAndroid} from "./device/deviceUtils";

const PERA_WALLET_APP_DEEP_LINK = isAndroid() ? "algorand://" : "algorand-wc://";
const PERA_DOWNLOAD_URL = "https://perawallet.app/download/";

function getPeraWebWalletURL(webWalletURL: string) {
  return {
    ROOT: `https://${webWalletURL}`,
    CONNECT: `https://${webWalletURL}/connect`,
    TRANSACTION_SIGN: `https://${webWalletURL}/transaction/sign`
  };
}

export {PERA_WALLET_APP_DEEP_LINK, getPeraWebWalletURL, PERA_DOWNLOAD_URL};
