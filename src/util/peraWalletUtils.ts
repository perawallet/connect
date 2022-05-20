import PeraWalletLogo from "../asset/icon/PeraWallet.svg";

import {detectBrowser, isAndroid} from "./device/deviceUtils";
import {PERA_WALLET_APP_DEEP_LINK} from "./peraWalletConstants";
import {AppMeta} from "./peraWalletTypes";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "./storage/storageConstants";

function generatePeraWalletAppDeepLink() {
  return (
    localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.DEEP_LINK) ||
    PERA_WALLET_APP_DEEP_LINK
  );
}

function getPeraWalletAppMeta(): AppMeta {
  const storedAppMeta = localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.APP_META);

  if (storedAppMeta) {
    return JSON.parse(storedAppMeta) as AppMeta;
  }

  return {
    logo: PeraWalletLogo,
    name: "Pera Wallet",
    main_color: "#ffee55"
  };
}

/**
 * @param {string} uri WalletConnect uri
 * @returns {string} Pera Wallet deeplink
 */
function generatePeraWalletConnectDeepLink(uri: string): string {
  let deeplink = `${generatePeraWalletAppDeepLink()}wc?uri=${encodeURIComponent(uri)}`;
  const browserName = detectBrowser();

  if (isAndroid()) {
    deeplink = uri;
  }

  if (browserName) {
    deeplink = `${deeplink}&browser=${browserName}`;
  }

  return deeplink;
}

export {
  generatePeraWalletAppDeepLink,
  getPeraWalletAppMeta,
  generatePeraWalletConnectDeepLink
};
