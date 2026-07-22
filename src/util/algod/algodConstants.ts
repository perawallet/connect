import {AlgodCredentials, AlgorandNodeProviderType} from "./algodTypes";

export const DEFAULT_ALGORAND_NODE_PROVIDER_TYPE: AlgorandNodeProviderType = "algodev";
export const MAINNET_NODE_CHAIN_ID = 416001;
export const TESTNET_NODE_CHAIN_ID = 416002;
export const BETANET_NODE_CHAIN_ID = 416003;
export const ALGORAND_NODE_CHAIN_ID = 4160;
export const DEFAULT_ALGORAND_CLIENT_PORT = 443;
const COMMON_ALGOD_CREDENTIALS = {
  clientToken: "0dw4Qu6ckPJTQY540Z0sEokH910KUWKjsf312fxNtTcVjw5UUhhlK4s4odcXIoEz",
  indexerToken: "KegWFLYQnBNVeP4oHCX64dObBk8VemzYdNqsnAOIxYQ8aqJLQTYeVDQyZNnx1PZA",
  port: DEFAULT_ALGORAND_CLIENT_PORT
};
const ALGOD_CREDENTIALS: AlgodCredentials = {
  mainnet: {
    algodev: {
      ...COMMON_ALGOD_CREDENTIALS,
      clientServer: "https://node-mainnet.chain.perawallet.app/",
      indexerServer: "https://indexer-mainnet.chain.perawallet.app/",
      chainId: MAINNET_NODE_CHAIN_ID
    }
  },
  testnet: {
    algodev: {
      ...COMMON_ALGOD_CREDENTIALS,
      clientServer: "https://node-testnet.chain.perawallet.app/",
      indexerServer: "https://indexer-testnet.chain.perawallet.app/",
      chainId: TESTNET_NODE_CHAIN_ID
    }
  }
};

export default ALGOD_CREDENTIALS;
