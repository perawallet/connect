import {isAndroid} from "./device/deviceUtils";

const PERA_WALLET_APP_DEEP_LINK = isAndroid() ? "algorand://" : "algorand-wc://";

const PERA_WEB_WALLET_URL = {
  dev: {
    ROOT: "https://localhost:3001",
    CONNECT: "https://localhost:3001/connect",
    TRANSACTION_SIGN: "https://localhost:3001/transaction/sign"
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

const PERA_WEB_EMBEED_WALLET_URL = {
  dev: {
    ROOT: "https://localhost:3001",
    CONNECT: "https://localhost:3001/connect/?embedded=true",
    TRANSACTION_SIGN: "https://localhost:3001/transaction/sign?embedded=true"
  },
  testnet: {
    ROOT: "https://staging.web.perawallet.app",
    CONNECT: "https://staging.web.perawallet.app/connect?embedded=true",
    TRANSACTION_SIGN: "https://staging.web.perawallet.app/transaction/sign?embedded=true"
  },
  mainnet: {
    ROOT: "https://web.perawallet.app",
    CONNECT: "https://web.perawallet.app/connect?embedded=true",
    TRANSACTION_SIGN: "https://web.perawallet.app/transaction/sign?embedded=true"
  }
};

export {PERA_WALLET_APP_DEEP_LINK, PERA_WEB_WALLET_URL, PERA_WEB_EMBEED_WALLET_URL};
