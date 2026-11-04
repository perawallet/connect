import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'

import { PeraWalletModalDesktopMode } from '../PeraWalletConnectModalDesktopMode.js'
import { PERA_WALLET_EXTENSION_CONNECT_EVENT } from '../../../peraWalletConnectModalUtils.js'

vi.mock('qr-code-styling', () => ({
    default: class {
        private readonly data: string

        constructor(options: { data: string }) {
            this.data = options.data
        }

        append(container: HTMLElement) {
            const qr = document.createElement('div')

            qr.className = 'fake-qr'
            qr.dataset.data = this.data
            container.append(qr)
        }
    },
}))

const ACTIVE_CLASS = 'pera-wallet-accordion-item--active'

beforeAll(() => {
    if (!customElements.get('pera-wallet-modal-desktop-mode')) {
        customElements.define(
            'pera-wallet-modal-desktop-mode',
            PeraWalletModalDesktopMode,
        )
    }
})

// Parsed from markup so the attributes exist when the constructor runs, as
// they do when the connect modal renders this element.
function renderDesktopMode(attributes: Record<string, string> = {}) {
    const attributeMarkup = Object.entries({ uri: 'wc:test', ...attributes })
        .map(([name, value]) => `${name}="${value}"`)
        .join(' ')
    const container = document.createElement('div')

    container.innerHTML = `<pera-wallet-modal-desktop-mode ${attributeMarkup}></pera-wallet-modal-desktop-mode>`
    document.body.append(container)

    const element = container.querySelector('pera-wallet-modal-desktop-mode')!

    return { element, shadowRoot: element.shadowRoot! }
}

function getOptionIds(shadowRoot: ShadowRoot) {
    return Array.from(
        shadowRoot.querySelectorAll(
            '.pera-wallet-connect-modal-desktop-mode__default-view > .pera-wallet-accordion-item',
        ),
        item => item.id,
    )
}

function getActiveOptionIds(shadowRoot: ShadowRoot) {
    return Array.from(
        shadowRoot.querySelectorAll(`.${ACTIVE_CLASS}`),
        item => item.id,
    )
}

function getToggleButton(shadowRoot: ShadowRoot, optionId: string) {
    return shadowRoot
        .getElementById(optionId)!
        .querySelector<HTMLButtonElement>(
            '.pera-wallet-accordion-toggle__button',
        )!
}

function getModalRoot(shadowRoot: ShadowRoot) {
    return shadowRoot.getElementById('pera-wallet-connect-modal-desktop-mode')!
}

describe('PeraWalletModalDesktopMode', () => {
    afterEach(() => {
        document.body.innerHTML = ''
        delete window.onWebWalletConnect
    })

    it('renders the web wallet then the mobile option, with the web wallet expanded', () => {
        const { shadowRoot } = renderDesktopMode()

        expect(getOptionIds(shadowRoot)).toEqual([
            'web-wallet-option',
            'mobile-wallet-option',
        ])
        expect(getActiveOptionIds(shadowRoot)).toEqual(['web-wallet-option'])
    })

    it('lists and expands the mobile option first when mobile is promoted', () => {
        const { shadowRoot } = renderDesktopMode({ 'promote-mobile': 'true' })

        expect(getOptionIds(shadowRoot)).toEqual([
            'mobile-wallet-option',
            'web-wallet-option',
        ])
        expect(getActiveOptionIds(shadowRoot)).toEqual(['mobile-wallet-option'])
    })

    it('lists the extension option ahead of the others when it is enabled', () => {
        const { shadowRoot } = renderDesktopMode({
            'is-extension-enabled': 'true',
        })

        expect(getOptionIds(shadowRoot)).toEqual([
            'extension-wallet-option',
            'web-wallet-option',
            'mobile-wallet-option',
        ])
    })

    it('dispatches the extension connect event from the host element', () => {
        const { element, shadowRoot } = renderDesktopMode({
            'is-extension-enabled': 'true',
        })
        const listener = vi.fn()

        element.addEventListener(PERA_WALLET_EXTENSION_CONNECT_EVENT, listener)

        shadowRoot
            .getElementById('pera-wallet-connect-extension-launch-button')!
            .click()

        expect(listener).toHaveBeenCalledTimes(1)
        expect(listener.mock.calls[0][0].target).toBe(element)
    })

    it('renders the pairing QR code with the WalletConnect URI', () => {
        const { shadowRoot } = renderDesktopMode({ uri: 'wc:abc@1' })

        const qrCodes = shadowRoot
            .getElementById('pera-wallet-connect-modal-connect-qr-code')!
            .querySelectorAll<HTMLElement>('.fake-qr')

        expect(qrCodes).toHaveLength(1)
        expect(qrCodes[0].dataset.data).toBe('wc:abc@1')
    })

    it('asks for a single account in the QR code when single-account is set', () => {
        const { shadowRoot } = renderDesktopMode({
            uri: 'wc:abc@1',
            'single-account': 'true',
        })

        const qrCode = shadowRoot.querySelector<HTMLElement>('.fake-qr')

        expect(qrCode?.dataset.data).toBe('wc:abc@1&singleAccount=true')
    })

    it('renders no QR code without a URI', () => {
        const container = document.createElement('div')

        container.innerHTML =
            '<pera-wallet-modal-desktop-mode></pera-wallet-modal-desktop-mode>'
        document.body.append(container)

        const shadowRoot = container.querySelector(
            'pera-wallet-modal-desktop-mode',
        )!.shadowRoot!

        expect(shadowRoot.querySelector('.fake-qr')).toBeNull()
    })

    it('switches to the compact layout in compact mode', () => {
        const { shadowRoot } = renderDesktopMode({ 'compact-mode': 'true' })

        expect(
            getModalRoot(shadowRoot).classList.contains(
                'pera-wallet-connect-modal-desktop-mode--compact',
            ),
        ).toBe(true)
        expect(shadowRoot.querySelector('.fake-qr')).not.toBeNull()
    })

    it('marks the web wallet as unavailable when Pera Web is not offered', () => {
        const { shadowRoot } = renderDesktopMode({
            'is-web-wallet-avaliable': 'false',
        })

        const defaultView = shadowRoot.querySelector(
            '.pera-wallet-connect-modal-desktop-mode__default-view',
        )

        expect(
            defaultView?.classList.contains(
                'pera-wallet-connect-modal-desktop-mode__default-view--web-wallet-not-avaliable',
            ),
        ).toBe(true)
        expect(shadowRoot.querySelector('.fake-qr')).not.toBeNull()
    })

    describe('accordion', () => {
        it('expands a collapsed option and collapses the others', () => {
            const { shadowRoot } = renderDesktopMode()

            getToggleButton(shadowRoot, 'mobile-wallet-option').click()

            expect(getActiveOptionIds(shadowRoot)).toEqual([
                'mobile-wallet-option',
            ])
        })

        it('keeps an already expanded option open when its toggle is clicked', () => {
            const { shadowRoot } = renderDesktopMode()

            getToggleButton(shadowRoot, 'web-wallet-option').click()

            expect(getActiveOptionIds(shadowRoot)).toEqual([
                'web-wallet-option',
            ])
        })

        it('ignores clicks that do not land on a toggle', () => {
            const { shadowRoot } = renderDesktopMode()

            shadowRoot
                .getElementById('mobile-wallet-option')!
                .querySelector<HTMLElement>('.pera-wallet-accordion-toggle')!
                .click()
            shadowRoot.dispatchEvent(new MouseEvent('click'))

            expect(getActiveOptionIds(shadowRoot)).toEqual([
                'web-wallet-option',
            ])
        })
    })

    describe('download view', () => {
        it('opens the download view from the download button', () => {
            const { shadowRoot } = renderDesktopMode()

            shadowRoot
                .getElementById(
                    'pera-wallet-connect-modal-desktop-mode-download-pera-button',
                )!
                .click()

            const { classList } = getModalRoot(shadowRoot)

            expect(
                classList.contains(
                    'pera-wallet-connect-modal-desktop-mode--download',
                ),
            ).toBe(true)
            expect(
                classList.contains(
                    'pera-wallet-connect-modal-desktop-mode--default',
                ),
            ).toBe(false)
        })

        it('returns to the connect options from the back button', () => {
            const { shadowRoot } = renderDesktopMode()

            shadowRoot
                .getElementById(
                    'pera-wallet-connect-modal-desktop-mode-download-pera-button',
                )!
                .click()
            shadowRoot
                .getElementById(
                    'pera-wallet-connect-modal-download-pera-view-back-button',
                )!
                .click()

            const { classList } = getModalRoot(shadowRoot)

            expect(
                classList.contains(
                    'pera-wallet-connect-modal-desktop-mode--default',
                ),
            ).toBe(true)
            expect(
                classList.contains(
                    'pera-wallet-connect-modal-desktop-mode--download',
                ),
            ).toBe(false)
        })
    })

    describe('Pera Web launch button', () => {
        function clickLaunchPeraWeb(shadowRoot: ShadowRoot) {
            shadowRoot
                .getElementById('pera-wallet-connect-web-wallet-launch-button')!
                .click()
        }

        it('starts the Pera Web connect flow when Pera Web is available', () => {
            const onWebWalletConnect = vi.fn().mockResolvedValue(undefined)

            window.onWebWalletConnect = onWebWalletConnect

            const { shadowRoot } = renderDesktopMode({
                'is-web-wallet-avaliable': 'true',
            })

            clickLaunchPeraWeb(shadowRoot)

            expect(onWebWalletConnect).toHaveBeenCalledTimes(1)
        })

        it('does nothing when Pera Web is not available', () => {
            const onWebWalletConnect = vi.fn().mockResolvedValue(undefined)

            window.onWebWalletConnect = onWebWalletConnect

            const { shadowRoot } = renderDesktopMode({
                'is-web-wallet-avaliable': 'false',
            })

            clickLaunchPeraWeb(shadowRoot)

            expect(onWebWalletConnect).not.toHaveBeenCalled()
        })
    })
})
