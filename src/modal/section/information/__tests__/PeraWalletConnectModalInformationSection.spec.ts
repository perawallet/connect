import { describe, it, expect, beforeAll, afterEach } from 'vitest'

import PeraWalletWithText from '../../../../asset/icon/PeraWallet--with-text.svg'
import { PeraWalletConnectModalInformationSection } from '../PeraWalletConnectModalInformationSection.js'

beforeAll(() => {
    if (!customElements.get('pera-wallet-connect-modal-information-section')) {
        customElements.define(
            'pera-wallet-connect-modal-information-section',
            PeraWalletConnectModalInformationSection,
        )
    }
})

function renderInformationSection() {
    const element = document.createElement(
        'pera-wallet-connect-modal-information-section',
    )

    document.body.append(element)

    return element.shadowRoot!
}

// The section reads compact mode from the connect modal element on the page.
function mountConnectModal(compactMode: string) {
    const modal = document.createElement('pera-wallet-connect-modal')

    modal.setAttribute('compact-mode', compactMode)
    document.body.append(modal)
}

describe('PeraWalletConnectModalInformationSection on desktop', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('shows the Pera Wallet wordmark and hides the mobile connect title', () => {
        mountConnectModal('false')

        const shadowRoot = renderInformationSection()

        expect(
            shadowRoot
                .getElementById(
                    'pera-wallet-connect-modal-information-section-pera-icon',
                )
                ?.getAttribute('src'),
        ).toBe(PeraWalletWithText)
        expect(
            shadowRoot.getElementById(
                'pera-wallet-connect-modal-information-section-connect-pera-mobile',
            )?.style.display,
        ).toBe('none')
    })

    it('renders when no connect modal is on the page', () => {
        const shadowRoot = renderInformationSection()

        expect(
            shadowRoot.querySelector(
                '.pera-wallet-connect-modal-information-section--desktop',
            ),
        ).not.toBeNull()
    })

    it('renders nothing in compact mode', () => {
        mountConnectModal('true')

        const shadowRoot = renderInformationSection()

        expect(shadowRoot.childElementCount).toBe(0)
    })
})
