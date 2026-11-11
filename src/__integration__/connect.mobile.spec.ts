import { describe, expect, it, vi } from 'vitest'

import { PeraWalletConnect } from '../index.js'
import { useIntegrationEnvironment } from './harness/environment.js'
import { connectWithPeraMobile, openConnectModal } from './harness/flows.js'
import { FAKE_BRIDGE_URL } from './harness/fakeNetwork.js'
import { FakePeraMobile } from './harness/fakePeraMobile.js'
import { walletConnectRelay } from './harness/fakeWalletConnect.js'
import { waitFor } from './harness/flush.js'
import {
    getConnectModal,
    getConnectModalUri,
    getConnectModalWrapper,
    getConnectOptionIds,
    getRenderedQrCodeData,
} from './harness/modalDom.js'
import {
    readStoredWallet,
    readStoredWalletConnectSession,
} from './harness/storage.js'
import { makePayment } from './harness/transactions.js'
import { hasValidSignatureBy } from './harness/walletCrypto.js'

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

describe('Connect with Pera Mobile via QR', () => {
    useIntegrationEnvironment()

    it('opens the connect modal with the pairing URI rendered as the QR code', async () => {
        const pera = new PeraWalletConnect()

        await openConnectModal(pera)

        const uri = getConnectModalUri()

        expect(uri).toMatch(/^wc:.+@1\?bridge=.+&key=.+&algorand=true$/)
        expect(uri).toContain(`bridge=${encodeURIComponent(FAKE_BRIDGE_URL)}`)
        expect(getRenderedQrCodeData()).toBe(uri)
        expect(getConnectOptionIds()).toEqual([
            'web-wallet-option',
            'mobile-wallet-option',
        ])
        expect(
            getConnectModalWrapper()?.getAttribute('is-extension-enabled'),
        ).toBe('false')
    })

    it('resolves with the approved accounts, closes the modal and persists the session', async () => {
        const mobile = new FakePeraMobile(2)
        const pera = new PeraWalletConnect()

        const { connecting } = await openConnectModal(pera)
        mobile.scanQrCode(getConnectModalUri())

        await expect(connecting).resolves.toEqual(mobile.addresses)
        expect(getConnectModalWrapper()).toBeNull()
        expect(pera.isConnected).toBe(true)
        expect(pera.platform).toBe('mobile')
        expect(readStoredWallet()).toEqual({
            type: 'pera-wallet',
            accounts: mobile.addresses,
            selectedAccount: mobile.addresses[0],
        })
        expect(readStoredWalletConnectSession()).toMatchObject({
            connected: true,
            accounts: mobile.addresses,
            bridge: FAKE_BRIDGE_URL,
            peerId: mobile.peerId,
        })
    })

    it('pairs over the bridge the dApp passes instead of the config one', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect({
            bridge: 'https://dapp-bridge.test',
        })

        const { connecting } = await openConnectModal(pera)
        mobile.scanQrCode(getConnectModalUri())
        await connecting

        expect(walletConnectRelay.latestConnector()?.bridge).toBe(
            'https://dapp-bridge.test',
        )
        expect(readStoredWalletConnectSession()?.bridge).toBe(
            'https://dapp-bridge.test',
        )
    })

    it('is not connected before the wallet approves', async () => {
        const pera = new PeraWalletConnect()

        await openConnectModal(pera)

        expect(pera.platform).toBeNull()
        expect(readStoredWallet()).toBeNull()
    })

    it('rejects with CONNECT_CANCELLED when the user declines the pairing in Pera', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const onDisconnect = vi.fn()

        pera.on('disconnect', onDisconnect)
        const { connecting } = await openConnectModal(pera)

        mobile.declinePairing(getConnectModalUri())

        await expect(connecting).rejects.toMatchObject({
            name: 'PeraWalletConnectError',
            data: { type: 'CONNECT_CANCELLED', detail: 'Session Rejected' },
        })
        expect(getConnectModalWrapper()).toBeNull()
        expect(onDisconnect).not.toHaveBeenCalled()
        expect(pera.isConnected).toBe(false)
        expect(readStoredWallet()).toBeNull()
    })

    it('connects again after the user declined a pairing', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const { connecting: declined } = await openConnectModal(pera)

        mobile.declinePairing(getConnectModalUri())
        await declined.catch(() => undefined)

        await expect(connectWithPeraMobile(pera, mobile)).resolves.toEqual(
            mobile.addresses,
        )
        expect(pera.platform).toBe('mobile')
    })

    it('shows the new pairing when connect() is called with a modal open, and settles both calls with it', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const { connecting: first } = await openConnectModal(pera)
        const firstUri = getConnectModalUri()

        const second = pera.connect()

        await waitFor(
            () => getConnectModal() && getConnectModalUri() !== firstUri,
        )
        mobile.scanQrCode(getConnectModalUri())

        await expect(second).resolves.toEqual(mobile.addresses)
        await expect(first).resolves.toEqual(mobile.addresses)
        expect(getConnectModalWrapper()).toBeNull()
    })

    it('pairs once when connect() is called twice before the modal opens', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()

        const first = pera.connect()
        const second = pera.connect()

        await waitFor(getConnectModal)
        mobile.scanQrCode(getConnectModalUri())

        await expect(first).resolves.toEqual(mobile.addresses)
        await expect(second).resolves.toEqual(mobile.addresses)
        expect(walletConnectRelay.connectors).toHaveLength(1)

        const [sender] = mobile.addresses
        const signing = pera.signTransaction([
            [{ txn: makePayment(sender, sender) }],
        ])

        await mobile.approveNextRequest()
        const [signed] = await signing

        expect(hasValidSignatureBy(signed, sender)).toBe(true)
    })
})
