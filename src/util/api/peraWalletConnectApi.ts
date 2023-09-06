import {shuffleArray} from "../array/arrayUtils";
import fetcher from "./fetcher";
import {PeraWalletConfig} from "./peraWalletConnectApiTypes";

const PERA_CONNECT_CONFIG_URL = "https://wc.perawallet.app/config.json";

/**
 * @returns {object} {web_wallet: boolean, web_wallet_url: string, use_sound: boolean, display_new_badge: boolean, servers: string[], promote_mobile: boolean}
 */
function fetchPeraConnectConfig() {
  const configURL = PERA_CONNECT_CONFIG_URL;

  return fetcher<{
    web_wallet: boolean | undefined;
    web_wallet_url: string | undefined;
    use_sound: boolean | undefined;
    display_new_badge: boolean | undefined;
    servers: string[] | undefined;
    silent: boolean | undefined;
    promote_mobile: boolean | undefined;
  }>(configURL, {cache: "no-store"});
}

/**
 * @returns {object} {bridgeURL: string, webWalletURL: string, isWebWalletAvailable: boolean, shouldDisplayNewBadge: boolean, shouldUseSound: boolean}
 */
async function getPeraConnectConfig() {
  let peraWalletConfig: PeraWalletConfig = {
    bridgeURL: "",
    webWalletURL: "",
    isWebWalletAvailable: false,
    shouldDisplayNewBadge: false,
    shouldUseSound: true,
    silent: false,
    promoteMobile: false
  };

  try {
    const response = await fetchPeraConnectConfig();

    if (typeof response.web_wallet !== "undefined" && response.web_wallet_url) {
      peraWalletConfig.isWebWalletAvailable = response.web_wallet!;
    }

    if (typeof response.display_new_badge !== "undefined") {
      peraWalletConfig.shouldDisplayNewBadge = response.display_new_badge!;
    }

    if (typeof response.use_sound !== "undefined") {
      peraWalletConfig.shouldUseSound = response.use_sound!;
    }

    if (typeof response.silent !== "undefined") {
      peraWalletConfig.silent = response.silent!;
    }

    if (typeof response.promote_mobile !== "undefined") {
      peraWalletConfig.promoteMobile = response.promote_mobile;
    }

    peraWalletConfig = {
      ...peraWalletConfig,
      bridgeURL: shuffleArray(response.servers || [])[0] || "",
      webWalletURL: response.web_wallet_url || ""
    };
  } catch (error) {
    console.log(error);
  }

  return peraWalletConfig;
}

export {getPeraConnectConfig, fetchPeraConnectConfig};
