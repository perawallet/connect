import { describe, expect, it, vi } from 'vitest'

import { PeraWalletConnect } from '../index.js'
import { useIntegrationEnvironment } from './harness/environment.js'
import { openConnectModal } from './harness/flows.js'
import { FakePeraMobile } from './harness/fakePeraMobile.js'
import {
    getConnectModalCloseButton,
    getConnectModalUri,
    getConnectModalWrapper,
} from './harness/modalDom.js'
import { readStoredWallet } from './harness/storage.js'

vi.mock('@perawallet/walletconnect', () =>
    import('./harness/fakeWalletConnect.js').then(m => ({
        default: m.FakeWalletConnect,
    })),
)
vi.mock('qr-code-styling', () =>
    import('./harness/fakeRendering.js').then(m => ({
        default: m.FakeQRCodeStyling,
    })),
)
vi.mock('@evanhahn/lottie-web-light', () =>
    import('./harness/fakeRendering.js').then(m => ({
        default: m.fakeLottie,
    })),
)

describe('User closes the connect modal', () => {
    useIntegrationEnvironment()

    it('rejects with CONNECT_MODAL_CLOSED and removes the modal', async () => {
        const pera = new PeraWalletConnect()
        const { connecting } = await openConnectModal(pera)
        getConnectModalCloseButton().click()

        await expect(connecting).rejects.toMatchObject({
            name: 'PeraWalletConnectError',
            data: { type: 'CONNECT_MODAL_CLOSED' },
        })
        expect(getConnectModalWrapper()).toBeNull()
        expect(pera.isConnected).toBe(false)
        expect(readStoredWallet()).toBeNull()
    })

    it('lets the user open the modal again and connect after closing it', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const { connecting: firstAttempt } = await openConnectModal(pera)
        const firstUri = getConnectModalUri()

        getConnectModalCloseButton().click()
        await expect(firstAttempt).rejects.toMatchObject({
            data: { type: 'CONNECT_MODAL_CLOSED' },
        })

        const { connecting: secondAttempt } = await openConnectModal(pera)
        const secondUri = getConnectModalUri()

        mobile.scanQrCode(secondUri)

        expect(secondUri).not.toBe(firstUri)
        await expect(secondAttempt).resolves.toEqual(mobile.addresses)
        expect(pera.platform).toBe('mobile')
    })

    // BUG: closing the modal rejects connect() but leaves the pairing live;
    // a later approval in Pera stores a mobile session behind the dApp's back.
    it.todo('ignores a wallet approval that arrives after the modal was closed')
})
