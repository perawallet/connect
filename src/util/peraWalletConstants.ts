const PERA_WALLET_APP_DEEP_LINK = "perawallet-wc://";
const PERA_DOWNLOAD_URL = "https://perawallet.app/download/";

// Adding "MX" prefix (bytes [77, 88]) to the signature to be consistent with algosdk.verifyBytes function
// eslint-disable-next-line no-magic-numbers
const PERA_WALLET_SIGNATURE_PREFIX = [77, 88];

export interface PeraWebWalletURLs {
  ROOT: string;
  CONNECT: string;
  TRANSACTION_SIGN: string;
}

function getPeraWebWalletURL(webWalletURL: string): PeraWebWalletURLs {
  return {
    ROOT: `https://${webWalletURL}`,
    CONNECT: `https://${webWalletURL}/connect`,
    TRANSACTION_SIGN: `https://${webWalletURL}/transaction/sign`
  };
}

export {
  PERA_WALLET_APP_DEEP_LINK,
  getPeraWebWalletURL,
  PERA_DOWNLOAD_URL,
  PERA_WALLET_SIGNATURE_PREFIX
};
