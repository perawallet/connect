import type algosdk from 'algosdk'

export type NetworkToggle = 'testnet' | 'mainnet'

/**
 * Algod clients supplied by the integrator, keyed by network. A network left
 * out falls back to a public node.
 */
export type AlgodClients = Partial<Record<NetworkToggle, algosdk.Algodv2>>
