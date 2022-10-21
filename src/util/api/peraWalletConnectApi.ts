import {shuffleArray} from "../array/arrayUtils";
import fetcher from "./fetcher";

const WALLET_CONNECT_CONFIG_URL = "https://wc.perawallet.app/config.json";

/**
 * @returns {string[]} Bridge server list
 */
function fetchWalletConnectConfig() {
  return fetcher<{
    web_wallet: boolean;
    servers: string[];
  }>(WALLET_CONNECT_CONFIG_URL);
}

/**
 * If there's a bridge URL in local storage returns it
 * otherwise fetches the available servers and picks a random one and saves it to local storage
 *
 * @returns {object} {bridgeURL: string, isWebWalletAvaliable: boolean}
 */
async function getWalletConnectConfig() {
  const response = await fetchWalletConnectConfig();

  return {
    bridgeURL: shuffleArray(response.servers)[0],
    isWebWalletAvaliable: response.web_wallet
  };
}

export {getWalletConnectConfig, fetchWalletConnectConfig};
