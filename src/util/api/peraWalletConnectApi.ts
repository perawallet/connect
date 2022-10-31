import {shuffleArray} from "../array/arrayUtils";
import {PeraWalletNetwork} from "../peraWalletTypes";
import fetcher from "./fetcher";

const WALLET_CONNECT_CONFIG_URL = "https://wc.perawallet.app/config.json";
const WALLET_CONNECT_CONFIG_STAGING_URL = "https://wc.perawallet.app/config-staging.json";

/**
 * @returns {object} {bridgeURL: string, webWalletURL: string, isWebWalletAvaliable: boolean}
 */
function fetchWalletConnectConfig(network: PeraWalletNetwork) {
  const configURL =
    network === "mainnet" ? WALLET_CONNECT_CONFIG_URL : WALLET_CONNECT_CONFIG_STAGING_URL;

  return fetcher<{
    web_wallet: boolean;
    web_wallet_url: string;
    servers: string[];
  }>(configURL);
}

/**
 * @returns {object} {bridgeURL: string, webWalletURL: string, isWebWalletAvaliable: boolean}
 */
async function getWalletConnectConfig(network: PeraWalletNetwork) {
  const response = await fetchWalletConnectConfig(network);

  return {
    bridgeURL: shuffleArray(response.servers)[0],
    webWalletURL: response.web_wallet_url,
    isWebWalletAvaliable: response.web_wallet
  };
}

export {getWalletConnectConfig, fetchWalletConnectConfig};
