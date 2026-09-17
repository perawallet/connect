import type algosdk from "algosdk";

export type AlgorandNodeProviderType = "algodev";

export type AlgodCredentialShape = Record<
  AlgorandNodeProviderType,
  Readonly<{
    clientToken: string;
    clientServer: string;
    port: number;
    chainId?: number;
  }>
>;

export interface AlgodCredentials {
  mainnet: AlgodCredentialShape;
  testnet: AlgodCredentialShape;
}

export type NetworkToggle = "testnet" | "mainnet";

/**
 * Algod clients supplied by the integrator, keyed by network. A network left
 * out falls back to Pera's own node.
 */
export type AlgodClients = Partial<Record<NetworkToggle, algosdk.Algodv2>>;
