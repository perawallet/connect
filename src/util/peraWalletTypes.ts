type PeraWalletType = "pera-wallet" | "pera-wallet-web" | "pera-wallet-extension";
type PeraWalletPlatformType = "mobile" | "web" | "extension" | null;

// eslint-disable-next-line no-magic-numbers
type AlgorandChainIDs = 416001 | 416002 | 416003 | 4160;

interface PeraWalletDetails {
  type: PeraWalletType;
  accounts: string[];
  selectedAccount: string;
}

export type {PeraWalletType, PeraWalletPlatformType, PeraWalletDetails, AlgorandChainIDs};
