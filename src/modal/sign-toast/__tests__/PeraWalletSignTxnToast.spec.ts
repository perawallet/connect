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

import { PeraWalletSignTxnToast } from '../PeraWalletSignTxnToast.js'
import { SIGN_TXN_ANIMATION_URL } from '../util/peraWalletSignTxnToastConstants.js'
import {
    PERA_WALLET_SIGN_TXN_TOAST_ID,
    closePeraWalletSignTxnToast,
    openPeraWalletSignTxnToast,
} from '../../peraWalletConnectModalUtils.js'

vi.mock('@evanhahn/lottie-web-light', () => ({
    default: { loadAnimation: vi.fn() },
}))

beforeAll(() => {
    if (!customElements.get('pera-wallet-sign-txn-toast')) {
        customElements.define(
            'pera-wallet-sign-txn-toast',
            PeraWalletSignTxnToast,
        )
    }
})

function getToastShadowRoot() {
    return document
        .getElementById(PERA_WALLET_SIGN_TXN_TOAST_ID)!
        .querySelector('pera-wallet-sign-txn-toast')!.shadowRoot!
}

describe('PeraWalletSignTxnToast', () => {
    beforeEach(() => {
        vi.mocked(Lottie.loadAnimation).mockClear()
    })

    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('plays the signing animation inside the toast', () => {
        openPeraWalletSignTxnToast()

        const animationWrapper = getToastShadowRoot().getElementById(
            'pera-wallet-sign-txn-toast-lottie-animation',
        )

        expect(Lottie.loadAnimation).toHaveBeenCalledTimes(1)
        expect(Lottie.loadAnimation).toHaveBeenCalledWith(
            expect.objectContaining({
                container: animationWrapper,
                path: SIGN_TXN_ANIMATION_URL,
            }),
        )
    })

    it('removes the toast when its close button is clicked', () => {
        openPeraWalletSignTxnToast()

        getToastShadowRoot()
            .getElementById('pera-wallet-sign-txn-toast-close-button')!
            .click()

        expect(
            document.getElementById(PERA_WALLET_SIGN_TXN_TOAST_ID),
        ).toBeNull()
    })

    it('is removed by closePeraWalletSignTxnToast', () => {
        openPeraWalletSignTxnToast()

        closePeraWalletSignTxnToast()

        expect(
            document.getElementById(PERA_WALLET_SIGN_TXN_TOAST_ID),
        ).toBeNull()
    })
})
