import {
  MAINNET_NODE_CHAIN_ID,
  TESTNET_NODE_CHAIN_ID,
  BETANET_NODE_CHAIN_ID,
  ALGORAND_NODE_CHAIN_ID
} from "./algodConstants";

export type AlgorandNodeProviderType = "algodev";

export type AlgodCredentialShape = Record<
  AlgorandNodeProviderType,
  Readonly<{
    clientToken: string;
    clientServer: string;
    indexerToken: string;
    indexerServer: string;
    port: number;
    chainId?: number;
  }>
>;

export interface AlgorandNodeProvider {
  type: AlgorandNodeProviderType;
  isHealthy: boolean;
  title: string;
}

export interface AlgodCredentials {
  mainnet: AlgodCredentialShape;
  testnet: AlgodCredentialShape;
}

export type NetworkToggle = "testnet" | "mainnet";

export type AlgorandChainIDs =
  | typeof ALGORAND_NODE_CHAIN_ID
  | typeof MAINNET_NODE_CHAIN_ID
  | typeof TESTNET_NODE_CHAIN_ID
  | typeof BETANET_NODE_CHAIN_ID;
