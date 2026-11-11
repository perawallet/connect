import { describe, expect, it, vi } from 'vitest'

import { PeraWalletConnect } from '../index.js'
import { useIntegrationEnvironment } from './harness/environment.js'
import { FakePeraExtension } from './harness/fakePeraExtension.js'
import { FakePeraMobile } from './harness/fakePeraMobile.js'
import { walletConnectRelay } from './harness/fakeWalletConnect.js'
import {
    connectWithPeraExtension,
    connectWithPeraMobile,
} from './harness/flows.js'
import {
    readStoredWallet,
    readStoredWalletConnectSession,
    STORAGE_KEYS,
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

/** Records what the dApp would see from inside its handler. */
function watchDisconnect(pera: PeraWalletConnect) {
    const seen: { isConnected: boolean; platform: unknown }[] = []

    pera.on('disconnect', () =>
        seen.push({ isConnected: pera.isConnected, platform: pera.platform }),
    )

    return seen
}

describe('Wallet-side disconnect', () => {
    useIntegrationEnvironment()

    it('fires on("disconnect") with the session already cleared when Pera Mobile ends it', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()

        await connectWithPeraMobile(pera, mobile)
        const seen = watchDisconnect(pera)

        mobile.endSession()

        expect(seen).toEqual([{ isConnected: false, platform: null }])
        expect(readStoredWallet()).toBeNull()
        expect(readStoredWalletConnectSession()).toBeNull()
    })

    it('fires on("disconnect") when the user revokes the site in the extension', async () => {
        const extension = new FakePeraExtension().install()
        const pera = new PeraWalletConnect()

        await connectWithPeraExtension(pera)
        const seen = watchDisconnect(pera)

        extension.revokeOrigin()

        expect(seen).toEqual([{ isConnected: false, platform: null }])
        expect(readStoredWallet()).toBeNull()
    })

    it('ignores an extension revoke while the session is with Pera Mobile', async () => {
        const extension = new FakePeraExtension().install()
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()

        await connectWithPeraMobile(pera, mobile)
        const seen = watchDisconnect(pera)

        extension.revokeOrigin()

        expect(seen).toEqual([])
        expect(pera.platform).toBe('mobile')
        expect(readStoredWallet()?.accounts).toEqual(mobile.addresses)
    })

    it('forwards the extension switching network', async () => {
        const extension = new FakePeraExtension({
            network: 'testnet',
        }).install()
        const pera = new PeraWalletConnect()
        const onNetworkChanged = vi.fn()

        await connectWithPeraExtension(pera)
        pera.on('networkChanged', onNetworkChanged)

        extension.switchNetwork('mainnet')

        expect(onNetworkChanged).toHaveBeenCalledExactlyOnceWith({
            network: 'mainnet',
        })
    })

    it('stops calling a handler once it is unsubscribed', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const onDisconnect = vi.fn()

        await connectWithPeraMobile(pera, mobile)
        const unsubscribe = pera.on('disconnect', onDisconnect)

        unsubscribe()
        mobile.endSession()

        expect(onDisconnect).not.toHaveBeenCalled()
    })

    it('stops all events after dispose() and releases the provider', async () => {
        const extension = new FakePeraExtension().install()
        const pera = new PeraWalletConnect()
        const onDisconnect = vi.fn()
        const onNetworkChanged = vi.fn()

        await connectWithPeraExtension(pera)
        pera.on('disconnect', onDisconnect)
        pera.on('networkChanged', onNetworkChanged)

        pera.dispose()
        extension.switchNetwork('mainnet')
        extension.revokeOrigin()

        expect(onNetworkChanged).not.toHaveBeenCalled()
        expect(onDisconnect).not.toHaveBeenCalled()
        expect(extension.listenerCount('disconnect')).toBe(0)
        expect(extension.listenerCount('networkChanged')).toBe(0)
    })

    it('stops mobile events after dispose() without ending the wallet session', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const onDisconnect = vi.fn()

        await connectWithPeraMobile(pera, mobile)
        pera.on('disconnect', onDisconnect)

        pera.dispose()

        expect(readStoredWalletConnectSession()?.connected).toBe(true)

        mobile.endSession()

        expect(onDisconnect).not.toHaveBeenCalled()
    })

    it('reports a Pera Mobile end once however often the session is reconnected', async () => {
        const mobile = new FakePeraMobile()
        const first = new PeraWalletConnect()

        await connectWithPeraMobile(first, mobile)
        first.dispose()
        const pera = new PeraWalletConnect()
        const onDisconnect = vi.fn()

        pera.on('disconnect', onDisconnect)
        await expect(pera.reconnectSession()).resolves.toEqual(mobile.addresses)
        const connectorsBefore = walletConnectRelay.connectors.length
        await expect(pera.reconnectSession()).resolves.toEqual(mobile.addresses)

        expect(walletConnectRelay.connectors).toHaveLength(connectorsBefore)

        mobile.endSession()

        expect(onDisconnect).toHaveBeenCalledTimes(1)
        expect(pera.isConnected).toBe(false)
    })

    it("still reports a Pera Mobile end after the dApp removed the connector's listeners and reconnected", async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()

        await connectWithPeraMobile(pera, mobile)
        const seen = watchDisconnect(pera)

        // A provider's effect cleanup, before its next mount reconnects.
        pera.connector?.off('disconnect')
        await pera.reconnectSession()

        mobile.endSession()

        expect(seen).toEqual([{ isConnected: false, platform: null }])
        expect(readStoredWallet()).toBeNull()
    })

    it('keeps one listener on the connector however often the session is reconnected', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()

        await connectWithPeraMobile(pera, mobile)
        const connector = walletConnectRelay.latestConnector()!
        const listeners = connector.listenerCount('disconnect')

        await pera.reconnectSession()
        await pera.reconnectSession()
        await pera.reconnectSession()

        expect(pera.connector).toBe(connector)
        expect(connector.listenerCount('disconnect')).toBe(listeners)

        pera.connector?.off('disconnect')
        await pera.reconnectSession()
        await pera.reconnectSession()

        expect(connector.listenerCount('disconnect')).toBe(1)
    })

    it('follows a session that changed in storage since the last reconnect', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()

        await connectWithPeraMobile(pera, mobile)
        const heldConnector = pera.connector
        const stored = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.WALLETCONNECT)!,
        )

        // Another tab of the same site paired again.
        localStorage.setItem(
            STORAGE_KEYS.WALLETCONNECT,
            JSON.stringify({ ...stored, peerId: 'pera-mobile-other-tab' }),
        )

        await expect(pera.reconnectSession()).resolves.toEqual(mobile.addresses)
        expect(pera.connector).not.toBe(heldConnector)
        expect(pera.connector?.peerId).toBe('pera-mobile-other-tab')
    })
})
