import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    afterEach,
    vi,
} from 'vitest'

import { PeraWalletModalHeader } from '../PeraWalletModalHeader.js'
import { PERA_WALLET_REDIRECT_MODAL_ID } from '../../peraWalletConnectModalUtils.js'

// The header template is built when the module loads, so the user agent has to
// be in place before the import runs.
vi.hoisted(() => {
    Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
})

beforeAll(() => {
    if (!customElements.get('pera-wallet-modal-header')) {
        customElements.define('pera-wallet-modal-header', PeraWalletModalHeader)
    }
})

afterAll(() => {
    delete (window.navigator as any).userAgent
})

describe('PeraWalletModalHeader on mobile', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('renders only the close button, without the brand', () => {
        const wrapper = document.createElement('div')

        wrapper.id = PERA_WALLET_REDIRECT_MODAL_ID
        wrapper.innerHTML = `<pera-wallet-modal-header modal-id="${PERA_WALLET_REDIRECT_MODAL_ID}"></pera-wallet-modal-header>`
        document.body.append(wrapper)

        const shadowRoot = wrapper.querySelector(
            'pera-wallet-modal-header',
        )!.shadowRoot!

        expect(
            shadowRoot.querySelector('.pera-wallet-modal-header__brand'),
        ).toBeNull()

        shadowRoot
            .getElementById('pera-wallet-modal-header-close-button')!
            .click()

        expect(
            document.getElementById(PERA_WALLET_REDIRECT_MODAL_ID),
        ).toBeNull()
    })
})
