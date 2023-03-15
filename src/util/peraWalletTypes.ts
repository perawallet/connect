type PeraWalletType = "pera-wallet" | "pera-wallet-web";
type PeraWalletPlatformType = "mobile" | "web" | null;

// eslint-disable-next-line no-magic-numbers
type AlgorandChainIDs = 416001 | 416002 | 416003 | 4160;

interface PeraWalletDetails {
  type: PeraWalletType;
  accounts: string[];
  selectedAccount: string;
}

interface PeraWalletConnectMethodOptions {
  shouldSelectSingleAccount?: boolean;
}

interface PeraWalletConnectOptions {
  bridge?: string;
  shouldShowSignTxnToast?: boolean;
  chainId?: AlgorandChainIDs;
}

export type {
  PeraWalletType,
  PeraWalletPlatformType,
  PeraWalletDetails,
  AlgorandChainIDs,
  PeraWalletConnectMethodOptions,
  PeraWalletConnectOptions
};
