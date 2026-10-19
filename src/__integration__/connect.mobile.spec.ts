import { describe, expect, it, vi } from 'vitest'

import { PeraWalletConnect } from '../index.js'
import { useIntegrationEnvironment } from './harness/environment.js'
import { openConnectModal } from './harness/flows.js'
import { FAKE_BRIDGE_URL } from './harness/fakeNetwork.js'
import { FakePeraMobile } from './harness/fakePeraMobile.js'
import { walletConnectRelay } from './harness/fakeWalletConnect.js'
import {
    getConnectModalUri,
    getConnectModalWrapper,
    getConnectOptionIds,
    getRenderedQrCodeData,
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

    // BUG: a declined pairing reaches the SDK as WalletConnect `disconnect`,
    // not `connect`: the modal closes, connect() never settles, and the dApp
    // gets on('disconnect') for a session it never had.
    it.todo('rejects connect() when the user declines the pairing in Pera')

    // BUG: a second connect() while the first modal is open abandons the
    // first pairing but keeps its modal (the new URI is never shown), so a
    // scan pairs the phone and neither call ever settles.
    it.todo('shows the new pairing when connect() is called with a modal open')
})
