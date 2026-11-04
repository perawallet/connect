import { describe, it, expect, beforeAll, afterEach } from 'vitest'

import { PeraWalletModalTouchScreenMode } from '../PeraWalletModalTouchScreenMode.js'

const IPHONE_USER_AGENT =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const ANDROID_USER_AGENT =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const LAUNCH_BUTTON_ID =
    'pera-wallet-connect-modal-touch-screen-mode-launch-pera-wallet-button'

beforeAll(() => {
    if (!customElements.get('pera-wallet-modal-touch-screen-mode')) {
        customElements.define(
            'pera-wallet-modal-touch-screen-mode',
            PeraWalletModalTouchScreenMode,
        )
    }
})

function setUserAgent(userAgent: string) {
    Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value: userAgent,
    })
}

// Parsed from markup so the attributes exist when the constructor runs, as
// they do when the connect modal renders this element.
function renderTouchScreenMode(attributes: Record<string, string>) {
    const attributeMarkup = Object.entries(attributes)
        .map(([name, value]) => `${name}="${value}"`)
        .join(' ')
    const container = document.createElement('div')

    container.innerHTML = `<pera-wallet-modal-touch-screen-mode ${attributeMarkup}></pera-wallet-modal-touch-screen-mode>`
    document.body.append(container)

    const shadowRoot = container.querySelector(
        'pera-wallet-modal-touch-screen-mode',
    )!.shadowRoot!

    return {
        shadowRoot,
        launchLink: shadowRoot.getElementById(
            LAUNCH_BUTTON_ID,
        ) as HTMLAnchorElement,
    }
}

function tapWithoutNavigating(link: HTMLAnchorElement) {
    link.addEventListener('click', event => event.preventDefault())
    link.click()
}

describe('PeraWalletModalTouchScreenMode', () => {
    afterEach(() => {
        document.body.innerHTML = ''
        delete (window.navigator as any).userAgent
    })

    it('links the launch button to the WalletConnect deep link on iOS', () => {
        setUserAgent(IPHONE_USER_AGENT)

        const { launchLink } = renderTouchScreenMode({ uri: 'wc:abc@1' })

        expect(launchLink.getAttribute('href')).toBe(
            `perawallet-wc://wc?uri=${encodeURIComponent('wc:abc@1')}&browser=Safari`,
        )
    })

    it('hands Android the raw WalletConnect URI', () => {
        setUserAgent(ANDROID_USER_AGENT)

        const { launchLink } = renderTouchScreenMode({ uri: 'wc:abc@1' })

        expect(launchLink.getAttribute('href')).toBe('wc:abc@1&browser=Chrome')
    })

    it('carries the single-account and selected-account requests into the deep link', () => {
        setUserAgent(IPHONE_USER_AGENT)

        const { launchLink } = renderTouchScreenMode({
            uri: 'wc:abc@1',
            'single-account': 'true',
            'selected-account': 'ACCOUNT_ADDRESS',
        })

        expect(launchLink.getAttribute('href')).toContain(
            '&singleAccount=true&selectedAccount=ACCOUNT_ADDRESS',
        )
    })

    it('leaves the launch button without a link when there is no URI', () => {
        setUserAgent(IPHONE_USER_AGENT)

        const { launchLink } = renderTouchScreenMode({})

        expect(launchLink.hasAttribute('href')).toBe(false)
    })

    it('swaps to the pending message once Pera is launched', () => {
        setUserAgent(IPHONE_USER_AGENT)

        const { shadowRoot, launchLink } = renderTouchScreenMode({
            uri: 'wc:abc@1',
            'should-use-sound': 'true',
        })

        tapWithoutNavigating(launchLink)

        const pendingMessage = shadowRoot.querySelector(
            'pera-wallet-connect-modal-pending-message-section',
        )

        expect(pendingMessage?.getAttribute('should-use-sound')).toBe('true')
        expect(shadowRoot.getElementById(LAUNCH_BUTTON_ID)).toBeNull()
    })
})
