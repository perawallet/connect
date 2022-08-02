import {isAndroid} from "./device/deviceUtils";

const PERA_WALLET_APP_DEEP_LINK = isAndroid() ? "algorand://" : "algorand-wc://";

export {PERA_WALLET_APP_DEEP_LINK};
