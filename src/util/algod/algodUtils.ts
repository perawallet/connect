import ALGOD_CREDENTIALS, {
  MAINNET_NODE_CHAIN_ID,
  TESTNET_NODE_CHAIN_ID
} from "./algodConstants";
import {AlgorandNodeProviderType, NetworkToggle} from "./algodTypes";
import {AlgorandChainIDs} from "../peraWalletTypes";

function getAlgosdkCredentialsForNetwork(
  network: NetworkToggle,
  credentialType: AlgorandNodeProviderType
) {
  const {mainnet: mainnetCredentials, testnet: testnetCredentials} = ALGOD_CREDENTIALS;
  const preferredNetworkCredentials =
    network === "mainnet" ? mainnetCredentials : testnetCredentials;

  return {
    tokens: {
      client: preferredNetworkCredentials[credentialType].clientToken,
      indexer: preferredNetworkCredentials[credentialType].indexerToken
    },
    server: {
      client: preferredNetworkCredentials[credentialType].clientServer,
      indexer: preferredNetworkCredentials[credentialType].indexerServer
    },
    port: preferredNetworkCredentials[credentialType].port
  };
}

function getChainIdForNetwork(network: NetworkToggle): number {
  if (network === "mainnet") {
    return MAINNET_NODE_CHAIN_ID;
  }

  return TESTNET_NODE_CHAIN_ID;
}

/**
 * The network a chain id pins the session to, or `null` when it does not pin
 * one: all-networks `4160`, unset, or a network this client has no algod for.
 * Callers that can tolerate a guess apply their own fallback.
 */
function getNetworkFromChainId(chainId?: AlgorandChainIDs): NetworkToggle | null {
  if (chainId === MAINNET_NODE_CHAIN_ID) {
    return "mainnet";
  }

  if (chainId === TESTNET_NODE_CHAIN_ID) {
    return "testnet";
  }

  return null;
}

export {getAlgosdkCredentialsForNetwork, getChainIdForNetwork, getNetworkFromChainId};
