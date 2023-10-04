import {detectBrowser, isAndroid, isIOS} from "./device/deviceUtils";
import {PERA_WALLET_APP_DEEP_LINK} from "./peraWalletConstants";

function generatePeraWalletAppDeepLink(shouldAddBrowserName = true): string {
  let appDeepLink = PERA_WALLET_APP_DEEP_LINK;
  const browserName = detectBrowser();

  if (shouldAddBrowserName && browserName) {
    appDeepLink = `${appDeepLink}?browser=${encodeURIComponent(browserName)}`;
  }

  return appDeepLink;
}

function generateEmbeddedWalletURL(url: string, isCompactMode?: boolean) {
  const newURL = new URL(url);

  newURL.searchParams.append("embedded", "true");

  if (isCompactMode) newURL.searchParams.append("compactMode", "true");

  return newURL.toString();
}

/**
 * @param {string} uri WalletConnect uri
 * @returns {string} Pera Wallet deeplink
 */
function generatePeraWalletConnectDeepLink(uri: string): string {
  let appDeepLink = generatePeraWalletAppDeepLink(false);

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
    deepLink = `${deepLink}&browser=${encodeURIComponent(browserName)}`;
  }

  return deepLink;
}

export {
  generatePeraWalletAppDeepLink,
  generatePeraWalletConnectDeepLink,
  generateEmbeddedWalletURL
};
