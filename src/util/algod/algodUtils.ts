import ALGOD_CREDENTIALS, {
  MAINNET_NODE_CHAIN_ID,
  TESTNET_NODE_CHAIN_ID
} from "./algodConstants";
import {AlgodClients, AlgorandNodeProviderType, NetworkToggle} from "./algodTypes";
import {AlgorandChainIDs} from "../peraWalletTypes";
import PeraWalletConnectError from "../PeraWalletConnectError";

function getAlgosdkCredentialsForNetwork(
  network: NetworkToggle,
  credentialType: AlgorandNodeProviderType
) {
  const {mainnet: mainnetCredentials, testnet: testnetCredentials} = ALGOD_CREDENTIALS;
  const preferredNetworkCredentials =
    network === "mainnet" ? mainnetCredentials : testnetCredentials;

  return {
    tokens: {
      client: preferredNetworkCredentials[credentialType].clientToken
    },
    server: {
      client: preferredNetworkCredentials[credentialType].clientServer
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

/**
 * Checks supplied algod clients up front. Plain-JS callers bypass the type, and
 * a wrong value would otherwise surface much later as a failed account lookup.
 */
function assertValidAlgodClients(clients: AlgodClients) {
  (Object.entries(clients) as [NetworkToggle, unknown][]).forEach(([network, client]) => {
    if (
      !client ||
      typeof (client as {accountInformation?: unknown}).accountInformation !== "function"
    ) {
      throw new PeraWalletConnectError(
        {type: "INVALID_ALGOD_CLIENT", detail: {network}},
        `algod.${network} must be an algosdk.Algodv2 instance.`
      );
    }
  });
}

export {
  assertValidAlgodClients,
  getAlgosdkCredentialsForNetwork,
  getChainIdForNetwork,
  getNetworkFromChainId
};
