import {shuffleArray} from "../array/arrayUtils";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../storage/storageConstants";
import fetcher from "./fetcher";

const BRIDGE_SERVERS_URL = "https://wc.perawallet.app/servers.json";

/**
 * @returns {string[]} Bridge server list
 */
function listBridgeServers() {
  return fetcher<{
    servers: string[];
  }>(BRIDGE_SERVERS_URL);
}

/**
 * If there's a bridge URL in local storage returns it
 * otherwise fetches the available servers and picks a random one and saves it to local storage
 *
 * @returns {string} Bridge URL
 */
async function assignBridgeURL() {
  // Retrieve bridge from local storage
  const bridgeURL = localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.BRIDGE_URL);

  // User is already assigned to a bridge
  // No need to retrieve new one
  if (bridgeURL) {
    return bridgeURL;
  }

  // User is not assigned to a bridge
  // Retrieve available bridges
  const response = await listBridgeServers();

  // Pick a random bridge
  const newBridgeURL = shuffleArray(response.servers)[0];

  // Save bridge URL to local storage
  localStorage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.BRIDGE_URL, newBridgeURL);

  return newBridgeURL;
}

export {assignBridgeURL, listBridgeServers};
