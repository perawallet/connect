const PERA_WALLET_LOCAL_STORAGE_KEYS = {
    WALLET: 'PeraWallet.Wallet',
    WALLETCONNECT: 'PeraWallet.WalletConnect',
}

/**
 * WalletConnect v1's default key, shared by every WC v1 wallet on the origin, so
 * Pera must never write or remove it; only the legacy-session migration reads
 * it. Kept out of `PERA_WALLET_LOCAL_STORAGE_KEYS` so a reset can't touch it.
 */
const LEGACY_WALLETCONNECT_STORAGE_KEY = 'walletconnect'

export { PERA_WALLET_LOCAL_STORAGE_KEYS, LEGACY_WALLETCONNECT_STORAGE_KEY }
