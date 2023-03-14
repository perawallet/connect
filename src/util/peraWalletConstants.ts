import {isAndroid} from "./device/deviceUtils";

const PERA_WALLET_APP_DEEP_LINK = isAndroid() ? "algorand://" : "algorand-wc://";
const PERA_DOWNLOAD_URL = "https://perawallet.app/download/";

function getPeraWebWalletURL(webWalletURL: string) {
  console.log("webWalletURL", webWalletURL);

  return {
    ROOT: `https://dev.web.perawallet.app:3000/`,
    CONNECT: `https://dev.web.perawallet.app:3000/connect`,
    TRANSACTION_SIGN: `https://dev.web.perawallet.app:3000/transaction/sign`
  };
}

export {PERA_WALLET_APP_DEEP_LINK, getPeraWebWalletURL, PERA_DOWNLOAD_URL};
