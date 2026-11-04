import {
    describe,
    it,
    expect,
    beforeAll,
    beforeEach,
    afterEach,
    vi,
} from 'vitest'
import Lottie from '@evanhahn/lottie-web-light'

import { PeraWalletConnectModalPendingMessageSection } from '../PeraWalletConnectModalPendingMessage.js'
import {
    CONNECT_AUDIO_URL,
    CONNECT_TIMEOUT_INTERVAL,
    PERA_LOADER_ANIMATION_URL,
} from '../util/peraWalletConnectModalPendingMessageConstants.js'
import { PERA_WALLET_CONNECT_MODAL_ID } from '../../../peraWalletConnectModalUtils.js'

vi.mock('@evanhahn/lottie-web-light', () => ({
    default: { loadAnimation: vi.fn() },
}))

const IPHONE_USER_AGENT =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const AUDIO_WRAPPER_ID =
    'pera-wallet-connect-modal-pending-message-audio-wrapper'

beforeAll(() => {
    if (
        !customElements.get('pera-wallet-connect-modal-pending-message-section')
    ) {
        customElements.define(
            'pera-wallet-connect-modal-pending-message-section',
            PeraWalletConnectModalPendingMessageSection,
        )
    }
})

function setUserAgent(userAgent: string) {
    Object.defineProperty(window.navigator, 'userAgent', {
        configurable: true,
        value: userAgent,
    })
}

// Mounted inside the connect modal's wrapper, which is what closing removes.
function renderPendingMessage(attributes: Record<string, string> = {}) {
    const wrapper = document.createElement('div')
    const element = document.createElement(
        'pera-wallet-connect-modal-pending-message-section',
    )

    wrapper.id = PERA_WALLET_CONNECT_MODAL_ID

    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value)
    }

    wrapper.append(element)
    document.body.append(wrapper)

    return element.shadowRoot!
}

describe('PeraWalletConnectModalPendingMessageSection', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.mocked(Lottie.loadAnimation).mockClear()
    })

    afterEach(() => {
        vi.clearAllTimers()
        vi.useRealTimers()
        document.body.innerHTML = ''
        delete (window.navigator as any).userAgent
    })

    it('plays the loader animation while waiting', () => {
        const shadowRoot = renderPendingMessage()

        expect(Lottie.loadAnimation).toHaveBeenCalledWith(
            expect.objectContaining({
                container: shadowRoot.getElementById(
                    'pera-wallet-connect-modal-pending-message-animation-wrapper',
                ),
                path: PERA_LOADER_ANIMATION_URL,
            }),
        )
    })

    it('closes the connect modal when cancel is clicked', () => {
        const shadowRoot = renderPendingMessage()

        shadowRoot
            .getElementById(
                'pera-wallet-connect-modal-pending-message-cancel-button',
            )!
            .click()

        expect(document.getElementById(PERA_WALLET_CONNECT_MODAL_ID)).toBeNull()
    })

    it('plays the connection sound on iOS when sound is enabled', () => {
        setUserAgent(IPHONE_USER_AGENT)

        const shadowRoot = renderPendingMessage({ 'should-use-sound': 'true' })

        const audio = shadowRoot
            .getElementById(AUDIO_WRAPPER_ID)!
            .querySelector('audio')

        expect(audio?.src).toBe(CONNECT_AUDIO_URL)
        expect(audio?.autoplay).toBe(true)
        expect(audio?.loop).toBe(true)
    })

    it('stays silent when sound is disabled', () => {
        setUserAgent(IPHONE_USER_AGENT)

        const shadowRoot = renderPendingMessage({ 'should-use-sound': 'false' })

        expect(shadowRoot.querySelector('audio')).toBeNull()
    })

    it('stays silent outside iOS even when sound is enabled', () => {
        const shadowRoot = renderPendingMessage({ 'should-use-sound': 'true' })

        expect(shadowRoot.querySelector('audio')).toBeNull()
    })

    // Kept last: the timeout rewrites the module-level template, so instances
    // created after it start in the try-again view.
    it('offers to close and try again once the connection times out', () => {
        const shadowRoot = renderPendingMessage()

        vi.advanceTimersByTime(CONNECT_TIMEOUT_INTERVAL)

        const tryAgainButton = shadowRoot.getElementById(
            'pera-wallet-connect-modal-pending-message-try-again-button',
        )

        expect(
            shadowRoot.getElementById(
                'pera-wallet-connect-modal-pending-message-cancel-button',
            ),
        ).toBeNull()
        expect(tryAgainButton).not.toBeNull()

        tryAgainButton!.click()

        expect(document.getElementById(PERA_WALLET_CONNECT_MODAL_ID)).toBeNull()
    })
})
