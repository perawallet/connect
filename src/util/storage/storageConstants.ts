const PERA_WALLET_LOCAL_STORAGE_KEYS = {
  WALLET: "PeraWallet.Wallet",
  WALLETCONNECT: "PeraWallet.WalletConnect"
};

/**
 * The WalletConnect v1 default storage key. It is shared by every WC v1 wallet
 * library on the same origin (Defly, EVM wallets, ...), so Pera must never write
 * to or remove it. Versions of this library before the namespaced key above
 * stored the Pera session here; it is read ONLY by the one-time migration in
 * `storageUtils.ts`. Kept out of `PERA_WALLET_LOCAL_STORAGE_KEYS` on purpose so
 * a "reset every Pera key" helper can never touch it.
 */
const LEGACY_WALLETCONNECT_STORAGE_KEY = "walletconnect";

export {PERA_WALLET_LOCAL_STORAGE_KEYS, LEGACY_WALLETCONNECT_STORAGE_KEY};
