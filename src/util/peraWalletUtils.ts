import {detectBrowser} from "./device/deviceUtils";
import {PERA_WALLET_APP_DEEP_LINK} from "./peraWalletConstants";

/**
 * @param {string} uri WalletConnect uri
 * @returns {string} Pera Wallet deeplink
 */
function generatePeraWalletDeeplink(uri: string): string {
  let deeplink = `${PERA_WALLET_APP_DEEP_LINK}wc?uri=${encodeURIComponent(uri)}`;
  const browserName = detectBrowser();

  if (browserName) {
    deeplink = `${deeplink}&browser=${browserName}`;
  }

  return deeplink;
}

export {generatePeraWalletDeeplink};
