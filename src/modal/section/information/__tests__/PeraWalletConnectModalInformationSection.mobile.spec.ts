import {
    describe,
    it,
    expect,
    beforeAll,
    afterAll,
    afterEach,
    vi,
} from 'vitest'

import PeraWalletLogo from '../../../../asset/icon/PeraWallet.svg'
import { PeraWalletConnectModalInformationSection } from '../PeraWalletConnectModalInformationSection.js'

// The section picks its mobile or desktop layout when the module loads, so the
// user agent has to be in place before the import runs.
vi.hoisted(() => {
    Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    })
})

beforeAll(() => {
    if (!customElements.get('pera-wallet-connect-modal-information-section')) {
        customElements.define(
            'pera-wallet-connect-modal-information-section',
            PeraWalletConnectModalInformationSection,
        )
    }
})

afterAll(() => {
    delete (window.navigator as any).userAgent
})

function renderInformationSection() {
    const element = document.createElement(
        'pera-wallet-connect-modal-information-section',
    )

    document.body.append(element)

    return element.shadowRoot!
}

describe('PeraWalletConnectModalInformationSection on mobile', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('shows the Pera logo and the connect title', () => {
        const shadowRoot = renderInformationSection()

        expect(
            shadowRoot.querySelector(
                '.pera-wallet-connect-modal-information-section--mobile',
            ),
        ).not.toBeNull()
        expect(
            shadowRoot
                .getElementById(
                    'pera-wallet-connect-modal-information-section-pera-icon',
                )
                ?.getAttribute('src'),
        ).toBe(PeraWalletLogo)
        expect(
            shadowRoot.getElementById(
                'pera-wallet-connect-modal-information-section-connect-pera-mobile',
            )?.style.display,
        ).toBe('')
    })

    it('still renders when the connect modal is in compact mode', () => {
        const modal = document.createElement('pera-wallet-connect-modal')

        modal.setAttribute('compact-mode', 'true')
        document.body.append(modal)

        const shadowRoot = renderInformationSection()

        expect(
            shadowRoot.querySelector(
                '.pera-wallet-connect-modal-information-section',
            ),
        ).not.toBeNull()
    })
})
