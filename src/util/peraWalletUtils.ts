import PeraWalletLogo from "../asset/icon/PeraWallet.svg";

import {detectBrowser, isAndroid, isIOS} from "./device/deviceUtils";
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
  let appDeepLink = generatePeraWalletAppDeepLink();

  // Add `wc` suffix to the deeplink if it doesn't exist
  if (isIOS() && !appDeepLink.includes("-wc")) {
    appDeepLink = appDeepLink.replace("://", "-wc://");
  }

  let deepLink = `${appDeepLink}wc?uri=${encodeURIComponent(uri)}`;
  const browserName = detectBrowser();

  if (isAndroid()) {
    deepLink = uri;
  }

  if (browserName) {
    deepLink = `${deepLink}&browser=${browserName}`;
  }

  return deepLink;
}

export {
  generatePeraWalletAppDeepLink,
  getPeraWalletAppMeta,
  generatePeraWalletConnectDeepLink
};
