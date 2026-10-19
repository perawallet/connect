import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    afterEach,
    vi,
} from 'vitest'

import { PeraWalletConnectModal } from '../PeraWalletConnectModal.js'
import { PERA_WALLET_CONNECT_MODAL_ID } from '../peraWalletConnectModalUtils.js'

// The modal picks its mobile or desktop class names when the module loads, so
// the user agent has to be in place before the import runs.
vi.hoisted(() => {
    Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
})

beforeAll(() => {
    if (!customElements.get('pera-wallet-connect-modal')) {
        customElements.define(
            'pera-wallet-connect-modal',
            PeraWalletConnectModal,
        )
    }
})

afterAll(() => {
    delete (window.navigator as any).userAgent
})

function renderConnectModal(attributes: Record<string, string>) {
    const element = document.createElement('pera-wallet-connect-modal')

    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value)
    }

    document.body.append(element)

    return element.shadowRoot!
}

describe('PeraWalletConnectModal on mobile', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('renders the touch screen layout instead of the desktop one', () => {
        const shadowRoot = renderConnectModal({ uri: 'wc:abc@1' })

        expect(
            shadowRoot.querySelector('.pera-wallet-modal--mobile'),
        ).not.toBeNull()
        expect(
            shadowRoot
                .querySelector('pera-wallet-modal-header')
                ?.getAttribute('modal-id'),
        ).toBe(PERA_WALLET_CONNECT_MODAL_ID)
        expect(
            shadowRoot.querySelector('pera-wallet-modal-desktop-mode'),
        ).toBeNull()
    })

    it('passes the URI and account options on to the touch screen mode', () => {
        const shadowRoot = renderConnectModal({
            uri: 'wc:abc@1',
            'should-use-sound': 'true',
            'single-account': 'true',
            'selected-account': 'ACCOUNT_ADDRESS',
        })

        const touchScreenMode = shadowRoot.querySelector(
            'pera-wallet-modal-touch-screen-mode',
        )

        expect(touchScreenMode?.getAttribute('uri')).toBe('wc:abc@1')
        expect(touchScreenMode?.getAttribute('should-use-sound')).toBe('true')
        expect(touchScreenMode?.getAttribute('single-account')).toBe('true')
        expect(touchScreenMode?.getAttribute('selected-account')).toBe(
            'ACCOUNT_ADDRESS',
        )
    })

    it('does not ask for a single account unless told to', () => {
        const shadowRoot = renderConnectModal({ uri: 'wc:abc@1' })

        expect(
            shadowRoot
                .querySelector('pera-wallet-modal-touch-screen-mode')
                ?.getAttribute('single-account'),
        ).toBe('false')
    })
})
