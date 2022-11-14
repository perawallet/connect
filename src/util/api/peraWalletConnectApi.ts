import {shuffleArray} from "../array/arrayUtils";
import {PeraWalletNetwork} from "../peraWalletTypes";
import fetcher from "./fetcher";

const PERA_CONNECT_CONFIG_URL = "https://wc.perawallet.app/config.json";
const PERA_CONNECT_CONFIG_STAGING_URL = "https://wc.perawallet.app/config-staging.json";

/**
 * @returns {object} {bridgeURL: string, webWalletURL: string, isWebWalletAvaliable: boolean}
 */
function fetchPeraConnectConfig(network: PeraWalletNetwork) {
  const configURL =
    network === "mainnet" ? PERA_CONNECT_CONFIG_URL : PERA_CONNECT_CONFIG_STAGING_URL;

  return fetcher<{
    web_wallet: boolean;
    web_wallet_url: string;
    use_sound: boolean;
    display_new_badge: boolean;
    servers: string[];
  }>(configURL, {cache: "no-store"});
}

/**
 * @returns {object} {bridgeURL: string, webWalletURL: string, isWebWalletAvaliable: boolean}
 */
async function getPeraConnectConfig(network: PeraWalletNetwork) {
  const response = await fetchPeraConnectConfig(network);

  return {
    bridgeURL: shuffleArray(response.servers)[0],
    webWalletURL: response.web_wallet_url,
    isWebWalletAvaliable: response.web_wallet,
    shouldDisplayNewBadge: response.display_new_badge,
    shouldUseSound: response.use_sound
  };
}

export {getPeraConnectConfig, fetchPeraConnectConfig};
