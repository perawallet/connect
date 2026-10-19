import { type NetworkToggle } from './algodTypes'

export const MAINNET_NODE_CHAIN_ID = 416_001
export const TESTNET_NODE_CHAIN_ID = 416_002
export const BETANET_NODE_CHAIN_ID = 416_003
/** WalletConnect chain id for a session that accepts every network. */
export const ALGORAND_NODE_CHAIN_ID = 4160

// Public, tokenless Algorand nodes. A published SDK cannot keep a secret: any
// token shipped here is extractable from the bundle, usable by anyone, and
// impossible to rotate without breaking every released version.
//
// They are a third party on a shared free tier, so integrations that read often
// should pass their own client via the `algod` constructor option.
export const DEFAULT_ALGOD_TOKEN = ''
export const DEFAULT_ALGOD_PORT = 443
export const DEFAULT_ALGOD_SERVERS: Readonly<Record<NetworkToggle, string>> = {
    mainnet: 'https://mainnet-api.algonode.cloud/',
    testnet: 'https://testnet-api.algonode.cloud/',
}
