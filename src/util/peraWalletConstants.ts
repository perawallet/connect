import {isAndroid} from "./device/deviceUtils";

const PERA_WALLET_APP_DEEP_LINK = isAndroid() ? "algorand://" : "algorand-wc://";

const PERA_WEB_WALLET_URL = {
  dev: {
    ROOT: "https://localhost:3000",
    CONNECT: "https://localhost:3000/connect",
    TRANSACTION_SIGN: "https://localhost:3000/transaction/sign"
  },
  testnet: {
    ROOT: "https://staging.web.perawallet.app",
    CONNECT: "https://staging.web.perawallet.app/connect",
    TRANSACTION_SIGN: "https://staging.web.perawallet.app/transaction/sign"
  },
  mainnet: {
    ROOT: "https://web.perawallet.app",
    CONNECT: "https://web.perawallet.app/connect",
    TRANSACTION_SIGN: "https://web.perawallet.app/transaction/sign"
  }
};

export {PERA_WALLET_APP_DEEP_LINK, PERA_WEB_WALLET_URL};
