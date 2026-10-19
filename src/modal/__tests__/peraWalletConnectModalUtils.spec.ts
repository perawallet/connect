import {
    describe,
    it,
    expect,
    beforeAll,
    beforeEach,
    afterEach,
    vi,
    type MockInstance,
} from 'vitest'

import { PeraWalletConnectModal } from '../PeraWalletConnectModal.js'
import { PeraWalletModalHeader } from '../header/PeraWalletModalHeader.js'
import {
    PERA_WALLET_CONNECT_MODAL_ID,
    type PeraWalletModalConfig,
    createPeraWalletConnectQrcodeModal,
    openPeraWalletConnectModal,
    removeModalWrapperFromDOM,
    setupPeraWalletConnectModalCloseListener,
} from '../peraWalletConnectModalUtils.js'

const BASE_CONFIG: PeraWalletModalConfig = {
    isWebWalletAvailable: true,
    shouldDisplayNewBadge: true,
    shouldUseSound: false,
}

beforeAll(() => {
    if (!customElements.get('pera-wallet-connect-modal')) {
        customElements.define(
            'pera-wallet-connect-modal',
            PeraWalletConnectModal,
        )
    }

    if (!customElements.get('pera-wallet-modal-header')) {
        customElements.define('pera-wallet-modal-header', PeraWalletModalHeader)
    }
})

function getConnectModalElement() {
    return document
        .getElementById(PERA_WALLET_CONNECT_MODAL_ID)
        ?.querySelector('pera-wallet-connect-modal')
}

describe('peraWalletConnectModalUtils', () => {
    let windowOpenSpy: MockInstance<typeof window.open>

    beforeEach(() => {
        windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    })

    afterEach(() => {
        document.body.innerHTML = ''
    })

    describe('openPeraWalletConnectModal', () => {
        it('mounts the connect modal with the pairing URI and configuration', () => {
            openPeraWalletConnectModal({
                ...BASE_CONFIG,
                shouldUseSound: true,
                compactMode: true,
                promoteMobile: true,
                singleAccount: true,
                selectedAccount: 'ACCOUNT_ADDRESS',
            })('wc:abc@1')

            const modal = getConnectModalElement()

            expect(modal?.getAttribute('uri')).toBe('wc:abc@1&algorand=true')
            expect(modal?.getAttribute('is-web-wallet-avaliable')).toBe('true')
            expect(modal?.getAttribute('should-display-new-badge')).toBe('true')
            expect(modal?.getAttribute('should-use-sound')).toBe('true')
            expect(modal?.getAttribute('compact-mode')).toBe('true')
            expect(modal?.getAttribute('promote-mobile')).toBe('true')
            expect(modal?.getAttribute('single-account')).toBe('true')
            expect(modal?.getAttribute('selected-account')).toBe(
                'ACCOUNT_ADDRESS',
            )
            expect(windowOpenSpy).not.toHaveBeenCalled()
        })

        it('leaves the selected account empty when none is requested', () => {
            openPeraWalletConnectModal(BASE_CONFIG)('wc:abc@1')

            expect(
                getConnectModalElement()?.getAttribute('selected-account'),
            ).toBe('')
        })

        it('tells the extension whether the SDK renders its own option', () => {
            openPeraWalletConnectModal({
                ...BASE_CONFIG,
                isExtensionEnabled: true,
            })('wc:abc@1')

            const wrapper = document.getElementById(
                PERA_WALLET_CONNECT_MODAL_ID,
            )

            expect(wrapper?.getAttribute('is-extension-enabled')).toBe('true')
            expect(
                getConnectModalElement()?.getAttribute('is-extension-enabled'),
            ).toBe('true')
        })

        it('marks the extension option as off by default', () => {
            openPeraWalletConnectModal(BASE_CONFIG)('wc:abc@1')

            expect(
                document
                    .getElementById(PERA_WALLET_CONNECT_MODAL_ID)
                    ?.getAttribute('is-extension-enabled'),
            ).toBe('false')
        })

        it('does not mount a second modal while one is open', () => {
            const open = openPeraWalletConnectModal(BASE_CONFIG)

            open('wc:first@1')
            open('wc:second@1')

            const modals = document.querySelectorAll(
                'pera-wallet-connect-modal',
            )

            expect(modals).toHaveLength(1)
            expect(modals[0].getAttribute('uri')).toBe(
                'wc:first@1&algorand=true',
            )
        })

        it('hands the URI to Pera as a deep link inside the Pera in-app browser', () => {
            openPeraWalletConnectModal({
                ...BASE_CONFIG,
                isInWebview: true,
                singleAccount: true,
                selectedAccount: 'ACCOUNT_ADDRESS',
            })('wc:abc@1')

            expect(windowOpenSpy).toHaveBeenCalledTimes(1)

            const [deepLink, target] = windowOpenSpy.mock.calls[0]

            expect(target).toBe('_blank')
            expect(deepLink).toContain(
                `wc?uri=${encodeURIComponent('wc:abc@1')}`,
            )
            expect(deepLink).toContain('&singleAccount=true')
            expect(deepLink).toContain('&selectedAccount=ACCOUNT_ADDRESS')
            expect(
                document.getElementById(PERA_WALLET_CONNECT_MODAL_ID),
            ).toBeNull()
        })
    })

    describe('createPeraWalletConnectQrcodeModal', () => {
        it('opens the connect modal and closes it once pairing ends', () => {
            const qrcodeModal = createPeraWalletConnectQrcodeModal(BASE_CONFIG)

            qrcodeModal.open('wc:abc@1')
            const wasOpened = getConnectModalElement() != null

            qrcodeModal.close()

            expect(wasOpened).toBe(true)
            expect(
                document.getElementById(PERA_WALLET_CONNECT_MODAL_ID),
            ).toBeNull()
        })
    })

    describe('setupPeraWalletConnectModalCloseListener', () => {
        it('runs the close callback and removes the modal when the header close button is clicked', () => {
            const onClose = vi.fn()

            openPeraWalletConnectModal(BASE_CONFIG)('wc:abc@1')
            setupPeraWalletConnectModalCloseListener(
                PERA_WALLET_CONNECT_MODAL_ID,
                onClose,
            )

            getConnectModalElement()!
                .shadowRoot!.querySelector('pera-wallet-modal-header')!
                .shadowRoot!.getElementById(
                    'pera-wallet-modal-header-close-button',
                )!
                .click()

            expect(onClose).toHaveBeenCalledTimes(1)
            expect(
                document.getElementById(PERA_WALLET_CONNECT_MODAL_ID),
            ).toBeNull()
        })
    })

    describe('removeModalWrapperFromDOM', () => {
        it('removes only the wrapper with the given ID', () => {
            const target = document.createElement('div')
            const other = document.createElement('div')

            target.id = 'modal-to-remove'
            other.id = 'modal-to-keep'
            document.body.append(target, other)

            removeModalWrapperFromDOM('modal-to-remove')

            expect(document.getElementById('modal-to-remove')).toBeNull()
            expect(document.getElementById('modal-to-keep')).not.toBeNull()
        })
    })
})
