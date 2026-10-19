import { describe, expect, it, vi } from 'vitest'

import { PeraWalletConnect } from '../index.js'
import { useIntegrationEnvironment } from './harness/environment.js'
import { openConnectModal } from './harness/flows.js'
import { FakePeraExtension } from './harness/fakePeraExtension.js'
import { FakePeraMobile } from './harness/fakePeraMobile.js'
import { tick } from './harness/flush.js'
import {
    getConnectModalUri,
    getConnectModalWrapper,
    getConnectOptionIds,
    getExtensionConnectButton,
    getSelectedConnectOptionId,
} from './harness/modalDom.js'
import { readStoredWallet } from './harness/storage.js'
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
})
