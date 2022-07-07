interface AppMeta {
  logo: string;
  name: string;
  main_color: string;
}

type PeraWalletType = "pera-wallet" | "pera-wallet-web";

interface PeraWalletDetails {
  type: PeraWalletType;
  accounts: string[];
  selectedAccount: string;
}

export type {AppMeta, PeraWalletType, PeraWalletDetails};
