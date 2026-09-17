import {AlgodCredentials, AlgorandNodeProviderType} from "./algodTypes";

export const DEFAULT_ALGORAND_NODE_PROVIDER_TYPE: AlgorandNodeProviderType = "algodev";
export const MAINNET_NODE_CHAIN_ID = 416001;
export const TESTNET_NODE_CHAIN_ID = 416002;
export const BETANET_NODE_CHAIN_ID = 416003;
export const ALGORAND_NODE_CHAIN_ID = 4160;
export const DEFAULT_ALGORAND_CLIENT_PORT = 443;
// Public, tokenless Algorand nodes. A published SDK cannot keep a secret — any
// token shipped here is extractable from the bundle, usable by anyone against
// whoever it authenticates, and impossible to rotate without breaking every
// released version. These endpoints need no token at all.
//
// They are a third party on a shared free tier: integrations that read often
// should pass their own client via the `algod` constructor option.
const COMMON_ALGOD_CREDENTIALS = {
  clientToken: "",
  port: DEFAULT_ALGORAND_CLIENT_PORT
};
const ALGOD_CREDENTIALS: AlgodCredentials = {
  mainnet: {
    algodev: {
      ...COMMON_ALGOD_CREDENTIALS,
      clientServer: "https://mainnet-api.algonode.cloud/",
      chainId: MAINNET_NODE_CHAIN_ID
    }
  },
  testnet: {
    algodev: {
      ...COMMON_ALGOD_CREDENTIALS,
      clientServer: "https://testnet-api.algonode.cloud/",
      chainId: TESTNET_NODE_CHAIN_ID
    }
  }
};

export default ALGOD_CREDENTIALS;
