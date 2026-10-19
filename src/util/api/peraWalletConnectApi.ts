import { shuffleArray } from '../array/arrayUtils.js'
import { fetcher } from './fetcher.js'
import { type PeraWalletConfig } from './peraWalletConnectApiTypes.js'

const PERA_CONNECT_CONFIG_URL = 'https://wc.perawallet.app/config.json'

interface PeraConnectConfigResponse {
    web_wallet?: boolean
    web_wallet_url?: string
    use_sound?: boolean
    display_new_badge?: boolean
    /** WalletConnect bridges; one is picked at random to spread the load. */
    servers?: string[]
    silent?: boolean
    promote_mobile?: boolean
}

const DEFAULT_PERA_CONNECT_CONFIG: Readonly<PeraWalletConfig> = {
    bridgeURL: '',
    webWalletURL: '',
    isWebWalletAvailable: false,
    shouldDisplayNewBadge: false,
    shouldUseSound: true,
    silent: false,
    promoteMobile: false,
}

function fetchPeraConnectConfig() {
    return fetcher<PeraConnectConfigResponse>(PERA_CONNECT_CONFIG_URL, {
        cache: 'no-store',
    })
}

function valueOrDefault<T>(value: T | undefined, fallback: T): T {
    return value === undefined ? fallback : value
}

// Never rejects: an unreachable or malformed config falls back to the defaults
// so connecting still works.
async function getPeraConnectConfig(): Promise<PeraWalletConfig> {
    const defaults = DEFAULT_PERA_CONNECT_CONFIG

    try {
        const response = await fetchPeraConnectConfig()

        return {
            bridgeURL: shuffleArray(response.servers || [])[0] || '',
            webWalletURL: response.web_wallet_url || '',
            // Pera Web is only offered when the config also says where it is.
            isWebWalletAvailable: response.web_wallet_url
                ? valueOrDefault(
                      response.web_wallet,
                      defaults.isWebWalletAvailable,
                  )
                : defaults.isWebWalletAvailable,
            shouldDisplayNewBadge: valueOrDefault(
                response.display_new_badge,
                defaults.shouldDisplayNewBadge,
            ),
            shouldUseSound: valueOrDefault(
                response.use_sound,
                defaults.shouldUseSound,
            ),
            silent: valueOrDefault(response.silent, defaults.silent),
            promoteMobile: valueOrDefault(
                response.promote_mobile,
                defaults.promoteMobile,
            ),
        }
    } catch {
        return { ...defaults }
    }
}

export { getPeraConnectConfig, fetchPeraConnectConfig }
