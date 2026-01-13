import ALGOD_CREDENTIALS, {
  MAINNET_NODE_CHAIN_ID,
  TESTNET_NODE_CHAIN_ID,
  ALGORAND_NODE_CHAIN_ID
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

function getNetworkFromChainId(chainId: AlgorandChainIDs): NetworkToggle {
  if (chainId === MAINNET_NODE_CHAIN_ID || chainId === ALGORAND_NODE_CHAIN_ID) {
    return "mainnet";
  }

  if (chainId === TESTNET_NODE_CHAIN_ID) {
    return "testnet";
  }

  return "mainnet";
}

export {getAlgosdkCredentialsForNetwork, getChainIdForNetwork, getNetworkFromChainId};
