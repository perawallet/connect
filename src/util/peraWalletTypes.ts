type PeraWalletNetwork = "dev" | "testnet" | "mainnet";
type PeraWalletType = "pera-wallet" | "pera-wallet-web";
type PeraWalletPlatformType = "mobile" | "web" | null;
type PeraWalletFlowType = "EMBEDDED" | "NEW_TAB";

// eslint-disable-next-line no-magic-numbers
type AlgorandChainIDs = 416001 | 416002 | 416003 | 4160;

interface PeraWalletDetails {
  type: PeraWalletType;
  accounts: string[];
  selectedAccount: string;
  version: string;
  chainId?: string;
}

export type {
  PeraWalletType,
  PeraWalletPlatformType,
  PeraWalletDetails,
  AlgorandChainIDs,
  PeraWalletFlowType,
  PeraWalletNetwork
};
