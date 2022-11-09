interface AppMeta {
  logo: string;
  name: string;
  main_color: string;
}

type PeraWalletNetwork = "dev" | "testnet" | "mainnet";
type PeraWalletType = "pera-wallet" | "pera-wallet-web";
type PeraWalletPlatformType = "mobile" | "web" | null;

interface PeraWalletDetails {
  type: PeraWalletType;
  accounts: string[];
  selectedAccount: string;
}

export type {
  AppMeta,
  PeraWalletNetwork,
  PeraWalletType,
  PeraWalletPlatformType,
  PeraWalletDetails
};
