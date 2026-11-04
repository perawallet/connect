const PERA_WALLET_APP_DEEP_LINK = 'perawallet-wc://'
const PERA_DOWNLOAD_URL = 'https://perawallet.app/download/'

// "MX": the domain-separation prefix algosdk's signBytes/verifyBytes use.
const PERA_WALLET_SIGNATURE_PREFIX = [77, 88]

/**
 * Used ONLY when https://wc.perawallet.app/config.json can't be fetched or lists
 * no servers. A Pera-controlled name, so it can be repointed without an SDK
 * release (the public bridge.walletconnect.org was retired in 2023).
 */
const PERA_WALLET_CONNECT_FALLBACK_BRIDGE =
    'https://wallet-connect-fallback.perawallet.app'

export interface PeraWebWalletURLs {
    ROOT: string
    CONNECT: string
    TRANSACTION_SIGN: string
}

function getPeraWebWalletURL(webWalletURL: string): PeraWebWalletURLs {
    return {
        ROOT: `https://${webWalletURL}`,
        CONNECT: `https://${webWalletURL}/connect`,
        TRANSACTION_SIGN: `https://${webWalletURL}/transaction/sign`,
    }
}

export {
    PERA_WALLET_APP_DEEP_LINK,
    getPeraWebWalletURL,
    PERA_DOWNLOAD_URL,
    PERA_WALLET_SIGNATURE_PREFIX,
    PERA_WALLET_CONNECT_FALLBACK_BRIDGE,
}
