import { vi } from 'vitest'

const PERA_CONFIG_URL = 'https://wc.perawallet.app/config.json'

export const FAKE_BRIDGE_URL = 'https://bridge.fake-pera.test'
export const FAKE_WEB_WALLET_URL = 'https://web.fake-pera.test/'

/** The `config.json` Pera serves, in its wire shape. */
export interface PeraConfigJson {
    web_wallet?: boolean
    web_wallet_url?: string
    use_sound?: boolean
    display_new_badge?: boolean
    servers?: string[]
    silent?: boolean
    promote_mobile?: boolean
}

export const DEFAULT_PERA_CONFIG: Readonly<PeraConfigJson> = {
    web_wallet: false,
    web_wallet_url: FAKE_WEB_WALLET_URL,
    use_sound: false,
    display_new_badge: false,
    servers: [FAKE_BRIDGE_URL],
    silent: false,
    promote_mobile: false,
}

interface AlgodAccount {
    authAddr?: string
}

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    })
}

/**
 * Everything the SDK reaches over `fetch`: Pera's `config.json` and the public
 * algod nodes' account endpoint. Anything else answers 404, so an unexpected
 * request fails loudly rather than reaching the internet.
 */
export class FakeNetwork {
    config: PeraConfigJson = { ...DEFAULT_PERA_CONFIG }
    readonly requestedUrls: string[] = []
    private algodAccounts = new Map<string, AlgodAccount>()

    readonly fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(
            typeof input === 'string' || input instanceof URL
                ? input
                : input.url,
        )

        this.requestedUrls.push(url.href)

        if (url.href === PERA_CONFIG_URL) {
            return jsonResponse(this.config)
        }

        const accountMatch = /^\/v2\/accounts\/([A-Z2-7]{58})$/.exec(
            url.pathname,
        )

        if (url.hostname.endsWith('algonode.cloud') && accountMatch) {
            return this.accountResponse(accountMatch[1])
        }

        return jsonResponse({ message: 'not found' }, 404)
    })

    install() {
        vi.stubGlobal('fetch', this.fetch)
    }

    /** An account as algod reports it; `authAddr` makes it rekeyed. */
    setAlgodAccount(address: string, account: AlgodAccount = {}) {
        this.algodAccounts.set(address, account)
    }

    private accountResponse(address: string) {
        const account = this.algodAccounts.get(address)

        if (!account) {
            return jsonResponse({ message: 'account not found' }, 404)
        }

        return jsonResponse({
            address,
            amount: 1_000_000,
            'amount-without-pending-rewards': 1_000_000,
            'min-balance': 100_000,
            'pending-rewards': 0,
            rewards: 0,
            round: 1000,
            status: 'Offline',
            'total-apps-opted-in': 0,
            'total-assets-opted-in': 0,
            'total-created-apps': 0,
            'total-created-assets': 0,
            ...(account.authAddr && { 'auth-addr': account.authAddr }),
        })
    }
}
