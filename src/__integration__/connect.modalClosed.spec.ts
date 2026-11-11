import { describe, expect, it, vi } from 'vitest'

import { PeraWalletConnect } from '../index.js'
import {
    useIntegrationEnvironment,
    useMobileUserAgent,
} from './harness/environment.js'
import { connectWithPeraMobile, openConnectModal } from './harness/flows.js'
import { FakePeraMobile } from './harness/fakePeraMobile.js'
import { walletConnectRelay } from './harness/fakeWalletConnect.js'
import { tick } from './harness/flush.js'
import {
    getConnectModalCloseButton,
    getConnectModalUri,
    getConnectModalWrapper,
    getLaunchPeraWalletLink,
    getPendingMessageButton,
} from './harness/modalDom.js'
import {
    readStoredWallet,
    readStoredWalletConnectSession,
} from './harness/storage.js'

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

    it('ignores a wallet approval that arrives after the modal was closed', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const { connecting } = await openConnectModal(pera)
        const uri = getConnectModalUri()

        getConnectModalCloseButton().click()
        await expect(connecting).rejects.toMatchObject({
            data: { type: 'CONNECT_MODAL_CLOSED' },
        })

        mobile.scanQrCode(uri)

        expect(pera.isConnected).toBe(false)
        expect(pera.platform).toBeNull()
        expect(readStoredWallet()).toBeNull()
        expect(readStoredWalletConnectSession()).toBeNull()
    })

    it("closes the abandoned pairing's bridge connection", async () => {
        const pera = new PeraWalletConnect()
        const { connecting } = await openConnectModal(pera)
        const pairing = walletConnectRelay.findByUri(getConnectModalUri())

        getConnectModalCloseButton().click()
        await connecting.catch(() => undefined)

        expect(pairing?.transportClose).toHaveBeenCalledTimes(1)
        expect(pairing?.killSession).not.toHaveBeenCalled()
    })
})

describe('User dismisses the pending view on a phone', () => {
    useIntegrationEnvironment()

    // The deep link itself is the OS's business; jsdom would only report it.
    function tapLaunchPeraWallet() {
        const link = getLaunchPeraWalletLink()

        link.addEventListener('click', event => event.preventDefault(), {
            once: true,
        })
        link.click()
    }

    it('rejects with CONNECT_MODAL_CLOSED when the user taps Cancel', async () => {
        useMobileUserAgent()
        const pera = new PeraWalletConnect()
        const { connecting } = await openConnectModal(pera)

        tapLaunchPeraWallet()
        getPendingMessageButton('cancel-button').click()

        await expect(connecting).rejects.toMatchObject({
            name: 'PeraWalletConnectError',
            data: { type: 'CONNECT_MODAL_CLOSED' },
        })
        expect(getConnectModalWrapper()).toBeNull()
        expect(readStoredWallet()).toBeNull()
    })

    it('rejects with CONNECT_MODAL_CLOSED when the user taps Close & Try Again after the timeout', async () => {
        vi.useFakeTimers()
        useMobileUserAgent()
        const pera = new PeraWalletConnect()
        const { connecting } = await openConnectModal(pera)

        tapLaunchPeraWallet()
        await vi.advanceTimersByTimeAsync(30_000)
        getPendingMessageButton('try-again-button').click()

        await expect(connecting).rejects.toMatchObject({
            data: { type: 'CONNECT_MODAL_CLOSED' },
        })
        expect(getConnectModalWrapper()).toBeNull()
    })

    it('lets the user connect again after Cancel, even when Pera approves the old pairing late', async () => {
        useMobileUserAgent()
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const { connecting: cancelled } = await openConnectModal(pera)
        const staleUri = getConnectModalUri()

        tapLaunchPeraWallet()
        getPendingMessageButton('cancel-button').click()
        await expect(cancelled).rejects.toMatchObject({
            data: { type: 'CONNECT_MODAL_CLOSED' },
        })

        mobile.approveInFlight(staleUri)
        await tick()

        expect(
            walletConnectRelay.findByUri(staleUri)?.killSession,
        ).toHaveBeenCalled()
        expect(readStoredWalletConnectSession()).toBeNull()
        expect(readStoredWallet()).toBeNull()

        const { connecting: retry } = await openConnectModal(pera)
        const retryUri = getConnectModalUri()

        mobile.scanQrCode(retryUri)

        expect(retryUri).not.toBe(staleUri)
        await expect(retry).resolves.toEqual(mobile.addresses)
        expect(pera.platform).toBe('mobile')
        expect(readStoredWalletConnectSession()?.peerId).toBe(mobile.peerId)
    })

    it('keeps the session connected since, when Pera approves the old pairing late', async () => {
        useMobileUserAgent()
        const staleMobile = new FakePeraMobile()
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const onDisconnect = vi.fn()

        pera.on('disconnect', onDisconnect)
        const { connecting: cancelled } = await openConnectModal(pera)
        const staleUri = getConnectModalUri()

        tapLaunchPeraWallet()
        getPendingMessageButton('cancel-button').click()
        await cancelled.catch(() => undefined)
        await connectWithPeraMobile(pera, mobile)
        const liveSession = readStoredWalletConnectSession()

        staleMobile.approveInFlight(staleUri)
        await tick()

        expect(
            walletConnectRelay.findByUri(staleUri)?.killSession,
        ).not.toHaveBeenCalled()
        expect(readStoredWalletConnectSession()).toEqual(liveSession)
        expect(readStoredWallet()?.accounts).toEqual(mobile.addresses)
        expect(onDisconnect).not.toHaveBeenCalled()

        pera.dispose()
        const reloaded = new PeraWalletConnect()

        await expect(reloaded.reconnectSession()).resolves.toEqual(
            mobile.addresses,
        )
    })
})
