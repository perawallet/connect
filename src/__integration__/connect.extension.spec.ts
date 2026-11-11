import { describe, expect, it, vi } from 'vitest'

import { PeraWalletConnect } from '../index.js'
import { useIntegrationEnvironment } from './harness/environment.js'
import { connectWithPeraExtension, openConnectModal } from './harness/flows.js'
import {
    FakePeraExtension,
    uninstallPeraExtension,
} from './harness/fakePeraExtension.js'
import { FakePeraMobile } from './harness/fakePeraMobile.js'
import { walletConnectRelay } from './harness/fakeWalletConnect.js'
import { tick, waitFor } from './harness/flush.js'
import {
    getConnectModal,
    getConnectModalCloseButton,
    getConnectModalUri,
    getConnectModalWrapper,
    getConnectOptionIds,
    getExtensionConnectButton,
    getSelectedConnectOptionId,
} from './harness/modalDom.js'
import {
    readStoredWallet,
    readStoredWalletConnectSession,
} from './harness/storage.js'
import { clickAsUser } from './harness/userActivation.js'

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

describe('Connect with the Pera extension', () => {
    useIntegrationEnvironment()

    it('lists the extension first and pre-selected when window.pera is present', async () => {
        new FakePeraExtension().install()
        const pera = new PeraWalletConnect()

        await openConnectModal(pera)

        await expect(pera.isExtensionAvailable()).resolves.toBe(true)
        expect(getConnectOptionIds()).toEqual([
            'extension-wallet-option',
            'web-wallet-option',
            'mobile-wallet-option',
        ])
        expect(getSelectedConnectOptionId()).toBe('extension-wallet-option')
        // Tells the extension not to inject its own row into the modal.
        expect(
            getConnectModalWrapper()?.getAttribute('is-extension-enabled'),
        ).toBe('true')
    })

    it('calls window.pera.connect() within the click and resolves with its accounts', async () => {
        const extension = new FakePeraExtension({ accountCount: 2 }).install()
        const pera = new PeraWalletConnect({ chainId: 416_002 })
        const { connecting } = await openConnectModal(pera)

        // The fake extension refuses a first-time connect without the click's
        // user activation, so this only resolves if the call is synchronous.
        clickAsUser(getExtensionConnectButton())

        expect(extension.connect).toHaveBeenCalledTimes(1)
        expect(extension.connect).toHaveBeenCalledWith(
            expect.objectContaining({ network: 'testnet' }),
        )
        expect(getConnectModalWrapper()).toBeNull()
        await expect(connecting).resolves.toEqual(extension.addresses)
        expect(pera.platform).toBe('extension')
        expect(pera.isConnected).toBe(true)
        expect(readStoredWallet()).toEqual({
            type: 'pera-wallet-extension',
            accounts: extension.addresses,
            selectedAccount: extension.addresses[0],
        })
    })

    it('abandons the QR pairing so a later scan cannot overwrite the extension session', async () => {
        const extension = new FakePeraExtension().install()
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const onDisconnect = vi.fn()

        pera.on('disconnect', onDisconnect)
        const { connecting } = await openConnectModal(pera)
        const uri = getConnectModalUri()

        clickAsUser(getExtensionConnectButton())
        await connecting
        await tick()

        mobile.scanQrCode(uri)

        expect(pera.platform).toBe('extension')
        expect(readStoredWallet()).toMatchObject({
            type: 'pera-wallet-extension',
            accounts: extension.addresses,
        })
        expect(onDisconnect).not.toHaveBeenCalled()
    })

    it("closes the abandoned QR pairing's bridge connection, so a late approval stores no WalletConnect session", async () => {
        new FakePeraExtension().install()
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const { connecting } = await openConnectModal(pera)
        const uri = getConnectModalUri()

        clickAsUser(getExtensionConnectButton())
        await connecting

        expect(
            walletConnectRelay.findByUri(uri)?.transportClose,
        ).toHaveBeenCalled()

        mobile.scanQrCode(uri)

        expect(readStoredWalletConnectSession()).toBeNull()
        expect(pera.platform).toBe('extension')
    })

    it('answers the extension button once when connect() was called twice', async () => {
        const extension = new FakePeraExtension().install()
        const pera = new PeraWalletConnect()

        const first = pera.connect()
        const second = pera.connect()

        await waitFor(getConnectModal)
        clickAsUser(getExtensionConnectButton())

        expect(extension.connect).toHaveBeenCalledTimes(1)
        await expect(second).resolves.toEqual(extension.addresses)
        await expect(first).resolves.toEqual(extension.addresses)
    })

    it('stores no approval given in the extension after connect() was called again', async () => {
        const extension = new FakePeraExtension().install()

        extension.connectDecision = 'later'
        const pera = new PeraWalletConnect()
        const { connecting: first } = await openConnectModal(pera)

        clickAsUser(getExtensionConnectButton())
        const { connecting: second } = await openConnectModal(pera)

        extension.approvePendingConnect()
        await tick()
        getConnectModalCloseButton().click()

        await expect(second).rejects.toMatchObject({
            data: { type: 'CONNECT_MODAL_CLOSED' },
        })
        await expect(first).rejects.toMatchObject({
            data: { type: 'CONNECT_MODAL_CLOSED' },
        })
        expect(pera.isConnected).toBe(false)
        expect(pera.platform).toBeNull()
        expect(readStoredWallet()).toBeNull()
    })

    it('rejects with CONNECT_CANCELLED when the user rejects in the extension', async () => {
        const extension = new FakePeraExtension().install()

        extension.connectDecision = 'reject'
        const pera = new PeraWalletConnect()
        const { connecting } = await openConnectModal(pera)
        clickAsUser(getExtensionConnectButton())

        await expect(connecting).rejects.toMatchObject({
            data: { type: 'CONNECT_CANCELLED' },
        })
        expect(getConnectModalWrapper()).toBeNull()
        expect(pera.isConnected).toBe(false)
        expect(readStoredWallet()).toBeNull()
    })

    it('rejects with CONNECT_NETWORK_MISMATCH when the extension is on another network', async () => {
        new FakePeraExtension({ network: 'testnet' }).install()
        const pera = new PeraWalletConnect({ chainId: 416_001 })
        const { connecting } = await openConnectModal(pera)
        clickAsUser(getExtensionConnectButton())

        await expect(connecting).rejects.toMatchObject({
            data: { type: 'CONNECT_NETWORK_MISMATCH' },
        })
        expect(readStoredWallet()).toBeNull()
    })

    it('still connects over WalletConnect when the user scans the QR code instead', async () => {
        const extension = new FakePeraExtension().install()
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const { connecting } = await openConnectModal(pera)
        mobile.scanQrCode(getConnectModalUri())

        await expect(connecting).resolves.toEqual(mobile.addresses)
        expect(extension.connect).not.toHaveBeenCalled()
        expect(pera.platform).toBe('mobile')
    })

    it('leaves the extension out of the modal when shouldPreferExtension is false', async () => {
        new FakePeraExtension().install()
        const pera = new PeraWalletConnect({ shouldPreferExtension: false })

        await openConnectModal(pera)

        expect(getConnectOptionIds()).not.toContain('extension-wallet-option')
        expect(
            getConnectModalWrapper()?.getAttribute('is-extension-enabled'),
        ).toBe('false')
    })

    describe('with an instance used again after dispose()', () => {
        it('reconnects the extension session and keeps offering the extension', async () => {
            const extension = new FakePeraExtension({
                accountCount: 2,
            }).install()
            const pera = new PeraWalletConnect()

            await connectWithPeraExtension(pera)
            pera.dispose()

            await expect(pera.reconnectSession()).resolves.toEqual(
                extension.addresses,
            )
            expect(readStoredWallet()).toMatchObject({
                type: 'pera-wallet-extension',
                accounts: extension.addresses,
            })
            await expect(pera.isExtensionAvailable()).resolves.toBe(true)

            await openConnectModal(pera)

            expect(getConnectOptionIds()).toContain('extension-wallet-option')
        })

        it('listens to the provider again, until it is disposed again', async () => {
            const extension = new FakePeraExtension().install()
            const pera = new PeraWalletConnect()

            await connectWithPeraExtension(pera)
            pera.dispose()
            await pera.reconnectSession()
            const onDisconnect = vi.fn()

            pera.on('disconnect', onDisconnect)
            extension.revokeOrigin()

            expect(onDisconnect).toHaveBeenCalledTimes(1)

            pera.dispose()

            expect(extension.listenerCount('disconnect')).toBe(0)
            expect(extension.listenerCount('networkChanged')).toBe(0)
        })

        it('stays unsubscribed when only isExtensionAvailable() is asked', async () => {
            const extension = new FakePeraExtension().install()
            const pera = new PeraWalletConnect()

            pera.dispose()

            await expect(pera.isExtensionAvailable()).resolves.toBe(true)
            expect(extension.listenerCount('disconnect')).toBe(0)
            expect(extension.listenerCount('networkChanged')).toBe(0)
        })

        it('revokes the site in the extension on disconnect()', async () => {
            const extension = new FakePeraExtension().install()
            const pera = new PeraWalletConnect()

            await connectWithPeraExtension(pera)
            pera.dispose()
            await pera.disconnect()

            expect(extension.disconnect).toHaveBeenCalledTimes(1)
            expect(readStoredWallet()).toBeNull()
        })

        it('stays unsubscribed when the session is ended with disconnect()', async () => {
            const extension = new FakePeraExtension().install()
            const pera = new PeraWalletConnect()

            await connectWithPeraExtension(pera)
            pera.dispose()
            await pera.disconnect()

            expect(extension.listenerCount('disconnect')).toBe(0)
            expect(extension.listenerCount('networkChanged')).toBe(0)
        })

        it('clears the session when the extension is gone', async () => {
            new FakePeraExtension().install()
            const pera = new PeraWalletConnect()

            await connectWithPeraExtension(pera)
            pera.dispose()
            uninstallPeraExtension()

            await expect(pera.reconnectSession()).resolves.toEqual([])
            expect(readStoredWallet()).toBeNull()
            await expect(pera.isExtensionAvailable()).resolves.toBe(false)
        })
    })

    it('does not pick up an extension installed after an instance that was never disposed', async () => {
        const pera = new PeraWalletConnect()

        new FakePeraExtension().install()

        await expect(pera.isExtensionAvailable()).resolves.toBe(false)
    })
})
