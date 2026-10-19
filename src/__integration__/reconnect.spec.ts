import { describe, expect, it, vi } from 'vitest'

import { PeraWalletConnect } from '../index.js'
import { useIntegrationEnvironment } from './harness/environment.js'
import {
    FakePeraExtension,
    uninstallPeraExtension,
} from './harness/fakePeraExtension.js'
import { FakePeraMobile } from './harness/fakePeraMobile.js'
import {
    connectWithPeraExtension,
    connectWithPeraMobile,
} from './harness/flows.js'
import {
    readStoredWallet,
    readStoredWalletConnectSession,
    seedStoredWebSession,
} from './harness/storage.js'
import { hasValidSignatureBy } from './harness/walletCrypto.js'
import { makePayment } from './harness/transactions.js'

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

/** The page unloads: the old instance is gone, storage stays. */
function reloadPage(previous: PeraWalletConnect) {
    previous.dispose()

    return new PeraWalletConnect()
}

describe('Reload and reconnect', () => {
    const environment = useIntegrationEnvironment()

    it('resolves [] and stays disconnected when nothing is stored', async () => {
        const pera = new PeraWalletConnect()

        await expect(pera.reconnectSession()).resolves.toEqual([])
        expect(pera.isConnected).toBe(false)
        expect(pera.platform).toBeNull()
    })

    it('restores a Pera Mobile session from storage and can sign with it', async () => {
        const mobile = new FakePeraMobile(2)
        const first = new PeraWalletConnect()

        await connectWithPeraMobile(first, mobile)
        const pera = reloadPage(first)

        const accounts = await pera.reconnectSession()

        expect(accounts).toEqual(mobile.addresses)
        expect(pera.isConnected).toBe(true)
        expect(pera.platform).toBe('mobile')

        const [sender, receiver] = mobile.addresses
        const signing = pera.signTransaction([
            [{ txn: makePayment(sender, receiver) }],
        ])

        await mobile.approveNextRequest()
        const [signed] = await signing

        expect(hasValidSignatureBy(signed, sender)).toBe(true)
    })

    it('restores the session on the bridge it was paired over', async () => {
        const mobile = new FakePeraMobile()
        const first = new PeraWalletConnect()

        await connectWithPeraMobile(first, mobile)
        const pairedBridge = readStoredWalletConnectSession()?.bridge
        // The next page load's config points at another bridge.
        environment.network.config.servers = ['https://other-bridge.test']
        const pera = reloadPage(first)

        await pera.reconnectSession()

        expect(pera.bridge).toBe(pairedBridge)
    })

    it('reconnects an extension session through the provider without a gesture', async () => {
        const extension = new FakePeraExtension({ accountCount: 2 }).install()
        const first = new PeraWalletConnect()

        await connectWithPeraExtension(first)
        const pera = reloadPage(first)

        const accounts = await pera.reconnectSession()

        expect(accounts).toEqual(extension.addresses)
        expect(extension.connect).toHaveBeenCalledTimes(2)
        expect(pera.platform).toBe('extension')
        expect(pera.isConnected).toBe(true)
    })

    it('resolves [] and clears storage when the extension no longer approves the site', async () => {
        const extension = new FakePeraExtension().install()
        const first = new PeraWalletConnect()

        await connectWithPeraExtension(first)
        // Revoked while the page was closed, so no event reached it.
        extension.isOriginApproved = false
        const pera = reloadPage(first)

        await expect(pera.reconnectSession()).resolves.toEqual([])
        expect(readStoredWallet()).toBeNull()
        expect(pera.isConnected).toBe(false)
    })

    it('resolves [] and clears storage when the extension is gone', async () => {
        new FakePeraExtension().install()
        const first = new PeraWalletConnect()

        await connectWithPeraExtension(first)
        uninstallPeraExtension()
        const pera = reloadPage(first)

        await expect(pera.reconnectSession()).resolves.toEqual([])
        expect(readStoredWallet()).toBeNull()
        expect(pera.platform).toBeNull()
    })

    // Minor: with the WalletConnect session gone from storage, reconnect
    // resolves [] but leaves the wallet details, so `platform` stays 'mobile'.
    it.todo('clears stored details when the WalletConnect session is gone')

    it('restores a Pera Web session while Pera Web is offered', async () => {
        environment.network.config.web_wallet = true
        seedStoredWebSession(['WEB_ACCOUNT'])
        const pera = new PeraWalletConnect()

        await expect(pera.reconnectSession()).resolves.toEqual(['WEB_ACCOUNT'])
        expect(pera.platform).toBe('web')
        expect(pera.isConnected).toBe(true)
    })

    it('rejects with SESSION_RECONNECT when Pera Web is no longer offered', async () => {
        environment.network.config.web_wallet = false
        seedStoredWebSession(['WEB_ACCOUNT'])
        const pera = new PeraWalletConnect()

        await expect(pera.reconnectSession()).rejects.toMatchObject({
            data: { type: 'SESSION_RECONNECT' },
        })
    })
})
