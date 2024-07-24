import {isAndroid} from "./device/deviceUtils";

const PERA_WALLET_APP_DEEP_LINK = isAndroid() ? "algorand://" : "perawallet-wc://";
const PERA_DOWNLOAD_URL = "https://perawallet.app/download/";

enum AlgorandChainNamespace {
  Mainnet = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k",
  Testnet = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe"
}

enum AlgorandMethod {
  SignTransaction = "algo_signTxn",
  SignData = "algo_signData"
}

export interface PeraWebWalletURLs {
  ROOT: string;
  CONNECT: string;
  TRANSACTION_SIGN: string;
}

function getPeraWebWalletURL(_webWalletURL: string): PeraWebWalletURLs {
  const root = "https://web.perawallet.app/";

  return {
    ROOT: root,
    CONNECT: `${root}connect`,
    TRANSACTION_SIGN: `${root}transaction/sign`
  };
}

export {
  PERA_WALLET_APP_DEEP_LINK,
  getPeraWebWalletURL,
  PERA_DOWNLOAD_URL,
  AlgorandChainNamespace,
  AlgorandMethod
};
