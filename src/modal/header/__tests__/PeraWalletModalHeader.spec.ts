import { describe, it, expect, beforeAll, afterEach } from 'vitest'

import { PeraWalletModalHeader } from '../PeraWalletModalHeader.js'
import {
    PERA_WALLET_CONNECT_MODAL_ID,
    PERA_WALLET_REDIRECT_MODAL_ID,
} from '../../peraWalletConnectModalUtils.js'

beforeAll(() => {
    if (!customElements.get('pera-wallet-modal-header')) {
        customElements.define('pera-wallet-modal-header', PeraWalletModalHeader)
    }
})

// The header reads `modal-id` in its constructor, so it is parsed from markup
// inside the wrapper it belongs to, as the modals render it.
function renderHeaderInWrapper(modalId: string) {
    const wrapper = document.createElement('div')

    wrapper.id = modalId
    wrapper.innerHTML = `<pera-wallet-modal-header modal-id="${modalId}"></pera-wallet-modal-header>`
    document.body.append(wrapper)

    return wrapper.querySelector('pera-wallet-modal-header')!.shadowRoot!
}

function clickClose(shadowRoot: ShadowRoot) {
    shadowRoot.getElementById('pera-wallet-modal-header-close-button')!.click()
}

describe('PeraWalletModalHeader on desktop', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('shows the Pera Connect brand with the SDK version', () => {
        const shadowRoot = renderHeaderInWrapper(PERA_WALLET_CONNECT_MODAL_ID)

        const brand = shadowRoot.querySelector(
            '.pera-wallet-modal-header__brand',
        )

        expect(brand?.textContent).toContain('Pera Connect')
        expect(
            shadowRoot.querySelector(
                '.pera-wallet-modal-header__version-number',
            )?.textContent,
        ).toBe(PERA_CONNECT_VERSION)
    })

    it('closes the redirect modal from its close button', () => {
        const shadowRoot = renderHeaderInWrapper(PERA_WALLET_REDIRECT_MODAL_ID)

        clickClose(shadowRoot)

        expect(
            document.getElementById(PERA_WALLET_REDIRECT_MODAL_ID),
        ).toBeNull()
    })

    // The connect modal's close button is wired by
    // setupPeraWalletConnectModalCloseListener, which also runs the onClose
    // callback, so the header must not remove it on its own.
    it('leaves closing the connect modal to its close listener', () => {
        const shadowRoot = renderHeaderInWrapper(PERA_WALLET_CONNECT_MODAL_ID)

        clickClose(shadowRoot)

        expect(
            document.getElementById(PERA_WALLET_CONNECT_MODAL_ID),
        ).not.toBeNull()
    })
})
