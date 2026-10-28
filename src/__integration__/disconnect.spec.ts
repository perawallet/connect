import { describe, expect, it, vi } from 'vitest'

import { PeraWalletConnect } from '../index.js'
import { useIntegrationEnvironment } from './harness/environment.js'
import { FakePeraExtension } from './harness/fakePeraExtension.js'
import { FakePeraMobile } from './harness/fakePeraMobile.js'
import { walletConnectRelay } from './harness/fakeWalletConnect.js'
import {
    connectWithPeraExtension,
    connectWithPeraMobile,
    openConnectModal,
} from './harness/flows.js'
import {
    getConnectModalUri,
    getExtensionConnectButton,
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

describe('disconnect()', () => {
    useIntegrationEnvironment()

    it('ends the Pera Mobile session and clears everything without a disconnect event', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const onDisconnect = vi.fn()

        await connectWithPeraMobile(pera, mobile)
        const connector = walletConnectRelay.latestConnector()!
        pera.on('disconnect', onDisconnect)

        await pera.disconnect()

        expect(connector.killSession).toHaveBeenCalledTimes(1)
        expect(connector.connected).toBe(false)
        expect(pera.isConnected).toBe(false)
        expect(pera.platform).toBeNull()
        expect(readStoredWallet()).toBeNull()
        expect(readStoredWalletConnectSession()).toBeNull()
        // The dApp asked for it; on('disconnect') is for wallet-side ends.
        expect(onDisconnect).not.toHaveBeenCalled()
    })

    it('connects again from scratch over a new pairing', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()

        await connectWithPeraMobile(pera, mobile)
        const firstConnector = walletConnectRelay.latestConnector()
        await pera.disconnect()

        const { connecting } = await openConnectModal(pera)
        mobile.scanQrCode(getConnectModalUri())

        await expect(connecting).resolves.toEqual(mobile.addresses)
        expect(walletConnectRelay.latestConnector()).not.toBe(firstConnector)
        expect(pera.isConnected).toBe(true)
        expect(readStoredWallet()?.type).toBe('pera-wallet')
    })

    it('revokes the extension connection and needs a click to connect again', async () => {
        const extension = new FakePeraExtension().install()
        const pera = new PeraWalletConnect()

        await connectWithPeraExtension(pera)

        await pera.disconnect()

        expect(extension.disconnect).toHaveBeenCalledTimes(1)
        expect(extension.isOriginApproved).toBe(false)
        expect(pera.isConnected).toBe(false)
        expect(readStoredWallet()).toBeNull()
        await expect(pera.reconnectSession()).resolves.toEqual([])

        const { connecting } = await openConnectModal(pera)
        clickAsUser(getExtensionConnectButton())

        await expect(connecting).resolves.toEqual(extension.addresses)
        expect(pera.platform).toBe('extension')
    })

    it('is a no-op without a session', async () => {
        const pera = new PeraWalletConnect()

        await expect(pera.disconnect()).resolves.toBeUndefined()
        expect(pera.isConnected).toBe(false)
        expect(readStoredWallet()).toBeNull()
    })
})
