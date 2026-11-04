import { describe, it, expect, beforeAll, afterEach } from 'vitest'

import { PeraWalletConnectModal } from '../PeraWalletConnectModal.js'
import { PERA_WALLET_CONNECT_MODAL_ID } from '../peraWalletConnectModalUtils.js'

beforeAll(() => {
    if (!customElements.get('pera-wallet-connect-modal')) {
        customElements.define(
            'pera-wallet-connect-modal',
            PeraWalletConnectModal,
        )
    }
})

function renderConnectModal(attributes: Record<string, string>) {
    const element = document.createElement('pera-wallet-connect-modal')

    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value)
    }

    document.body.append(element)

    return element.shadowRoot!
}

describe('PeraWalletConnectModal on desktop', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('renders the desktop layout with a header for the connect modal', () => {
        const shadowRoot = renderConnectModal({ uri: 'wc:abc@1' })

        expect(
            shadowRoot.querySelector('.pera-wallet-modal--desktop'),
        ).not.toBeNull()
        expect(
            shadowRoot
                .querySelector('pera-wallet-modal-header')
                ?.getAttribute('modal-id'),
        ).toBe(PERA_WALLET_CONNECT_MODAL_ID)
        expect(
            shadowRoot.querySelector('pera-wallet-modal-touch-screen-mode'),
        ).toBeNull()
    })

    it('passes its configuration on to the desktop mode', () => {
        const shadowRoot = renderConnectModal({
            uri: 'wc:abc@1',
            'is-web-wallet-avaliable': 'true',
            'should-display-new-badge': 'false',
            'promote-mobile': 'true',
            'single-account': 'true',
            'is-extension-enabled': 'true',
        })

        const desktopMode = shadowRoot.querySelector(
            'pera-wallet-modal-desktop-mode',
        )

        expect(desktopMode?.getAttribute('uri')).toBe('wc:abc@1')
        expect(desktopMode?.getAttribute('is-web-wallet-avaliable')).toBe(
            'true',
        )
        expect(desktopMode?.getAttribute('should-display-new-badge')).toBe(
            'false',
        )
        expect(desktopMode?.getAttribute('promote-mobile')).toBe('true')
        expect(desktopMode?.getAttribute('single-account')).toBe('true')
        expect(desktopMode?.getAttribute('is-extension-enabled')).toBe('true')
    })

    it('switches to the compact layout and tells the desktop mode', () => {
        const shadowRoot = renderConnectModal({
            uri: 'wc:abc@1',
            'compact-mode': 'true',
        })

        expect(
            shadowRoot.querySelector('.pera-wallet-modal--compact'),
        ).not.toBeNull()
        expect(
            shadowRoot
                .querySelector('pera-wallet-modal-desktop-mode')
                ?.getAttribute('compact-mode'),
        ).toBe('true')
    })
})
