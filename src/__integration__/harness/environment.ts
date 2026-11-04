import { afterEach, beforeAll, beforeEach, vi } from 'vitest'

import { uninstallPeraExtension } from './fakePeraExtension.js'
import { FakeNetwork } from './fakeNetwork.js'
import { walletConnectRelay } from './fakeWalletConnect.js'
import { getConnectModal, getConnectModalCloseButton } from './modalDom.js'

const IPHONE_USER_AGENT =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

/**
 * Per-file setup for an integration spec. The spec itself must declare the
 * module fakes (vi.mock is hoisted per file):
 *
 *   vi.mock('@perawallet/walletconnect', () =>
 *       import('./harness/fakeWalletConnect.js').then(m => ({ default: m.FakeWalletConnect })))
 *   vi.mock('qr-code-styling', ...)  vi.mock('@evanhahn/lottie-web-light', ...)
 *
 * Every test starts from an empty page: no modals, no storage, no extension,
 * no WalletConnect sessions, the default Pera config and real timers.
 */
function useIntegrationEnvironment() {
    const environment = { network: new FakeNetwork() }

    beforeAll(async () => {
        // index.ts registers the modal's custom elements through a lazy
        // import; wait for it so the first modal renders for real.
        await import('../../App.js')
    })

    beforeEach(() => {
        environment.network = new FakeNetwork()
        environment.network.install()
    })

    afterEach(() => {
        // The user dismisses a modal a test left open, which settles that
        // connect() and drops its document listener before the next test.
        if (getConnectModal()) {
            getConnectModalCloseButton().click()
        }

        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        document.body.innerHTML = ''
        localStorage.clear()
        uninstallPeraExtension()
        delete window.onWebWalletConnect
        walletConnectRelay.reset()
    })

    return environment
}

/** Makes the page look like iOS Safari until the test ends. */
function useMobileUserAgent() {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(IPHONE_USER_AGENT)
}

export { useIntegrationEnvironment, useMobileUserAgent }
