// The keys and shapes the SDK persists. Sessions outlive SDK upgrades, so these
// are a compatibility surface in their own right, read here as a dApp's next
// page load would find them.

const STORAGE_KEYS = {
    WALLET: 'PeraWallet.Wallet',
    WALLETCONNECT: 'PeraWallet.WalletConnect',
} as const

interface StoredWallet {
    type: 'pera-wallet' | 'pera-wallet-web' | 'pera-wallet-extension'
    accounts: string[]
    selectedAccount?: string
}

interface StoredWalletConnectSession {
    connected: boolean
    accounts: string[]
    bridge: string
    peerId: string
}

function readJson<T>(key: string): T | null {
    const raw = localStorage.getItem(key)

    return raw ? (JSON.parse(raw) as T) : null
}

function readStoredWallet() {
    return readJson<StoredWallet>(STORAGE_KEYS.WALLET)
}

function readStoredWalletConnectSession() {
    return readJson<StoredWalletConnectSession>(STORAGE_KEYS.WALLETCONNECT)
}

/**
 * What a Pera Web connect leaves behind. Pera Web connects in another tab
 * over postMessage, which these flows don't drive, so its session is seeded.
 */
function seedStoredWebSession(accounts: string[]) {
    localStorage.setItem(
        STORAGE_KEYS.WALLET,
        JSON.stringify({
            type: 'pera-wallet-web',
            accounts,
            selectedAccount: accounts[0],
        }),
    )
}

export {
    STORAGE_KEYS,
    readStoredWallet,
    readStoredWalletConnectSession,
    seedStoredWebSession,
}
