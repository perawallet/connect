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
    getRedirectModal,
    getSignTxnToast,
} from './harness/modalDom.js'
import { seedStoredWebSession } from './harness/storage.js'
import { buildEmptySignature } from './harness/walletCrypto.js'

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

const TESTNET_CAIP2 = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe'
const EMPTY_SIGNATURES_TIMEOUT_MS = 30_000

describe('Empty signatures over Pera Mobile', () => {
    useIntegrationEnvironment()

    it('asks Pera silently and resolves one empty signature per session account', async () => {
        const mobile = new FakePeraMobile(2)
        const pera = new PeraWalletConnect({ chainId: 416_002 })

        await connectWithPeraMobile(pera, mobile)

        const asking = pera.getEmptySignatures()
        const relayed = await mobile.waitForRequest()

        // No user prompt of any kind for this request.
        expect(getSignTxnToast()).toBeNull()
        expect(getRedirectModal()).toBeNull()

        await mobile.approveNextRequest()

        await expect(asking).resolves.toEqual({
            [mobile.addresses[0]]: buildEmptySignature(),
            [mobile.addresses[1]]: buildEmptySignature(),
        })
        expect(relayed.request).toMatchObject({
            method: 'algo_getEmptySignatures',
            params: { chainId: TESTNET_CAIP2 },
        })
        expect(relayed.options).toEqual({ forcePushNotification: false })
    })

    it('keeps only accounts shared with this dApp, with standard base64 values', async () => {
        const mobile = new FakePeraMobile(3)
        const pera = new PeraWalletConnect({ chainId: 416_002 })
        const [shared, malformed, notShared] = mobile.addresses
        const { connecting } = await openConnectModal(pera)

        mobile.scanQrCode(getConnectModalUri(), [shared, malformed])
        await connecting

        const asking = pera.getEmptySignatures()
        await mobile.approveNextRequest(result => ({
            ...(result as Record<string, string>),
            [malformed]: 'base64url_-not-accepted',
        }))

        const emptySignatures = await asking

        expect(emptySignatures).toEqual({ [shared]: buildEmptySignature() })
        expect(emptySignatures).not.toHaveProperty(notShared)
    })

    it('requires a network for an all-networks session', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()

        await connectWithPeraMobile(pera, mobile)

        await expect(pera.getEmptySignatures()).rejects.toMatchObject({
            data: { type: 'EMPTY_SIGNATURES_NETWORK_REQUIRED' },
        })
        expect(walletConnectRelay.requests).toHaveLength(0)

        const asking = pera.getEmptySignatures('mainnet')
        const relayed = await mobile.approveNextRequest()

        await expect(asking).resolves.toHaveProperty(mobile.addresses[0])
        expect(relayed.request.params).toEqual({
            chainId: 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k',
        })
    })

    it('rejects with EMPTY_SIGNATURES_TIMEOUT when an older Pera never answers', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect({ chainId: 416_002 })

        await connectWithPeraMobile(pera, mobile)
        vi.useFakeTimers()

        const asking = pera.getEmptySignatures()
        asking.catch(() => undefined)
        await mobile.waitForRequest()
        await vi.advanceTimersByTimeAsync(EMPTY_SIGNATURES_TIMEOUT_MS)

        await expect(asking).rejects.toMatchObject({
            data: { type: 'EMPTY_SIGNATURES_TIMEOUT' },
        })
    })

    it('rejects with SESSION_DISCONNECTED before connecting', async () => {
        const pera = new PeraWalletConnect({ chainId: 416_002 })

        await expect(pera.getEmptySignatures()).rejects.toMatchObject({
            data: { type: 'SESSION_DISCONNECTED' },
        })
    })
})

describe('Empty signatures over the extension and Pera Web', () => {
    useIntegrationEnvironment()

    it('resolves the extension’s empty signatures for the network it is on', async () => {
        const extension = new FakePeraExtension({ accountCount: 2 }).install()
        const pera = new PeraWalletConnect({ chainId: 416_002 })

        await connectWithPeraExtension(pera)

        await expect(pera.getEmptySignatures()).resolves.toEqual({
            [extension.addresses[0]]: buildEmptySignature(),
            [extension.addresses[1]]: buildEmptySignature(),
        })
        expect(extension.getEmptySignatures).toHaveBeenCalledWith({
            network: 'testnet',
        })
    })

    it('rejects with EMPTY_SIGNATURES_NETWORK_MISMATCH for another network', async () => {
        new FakePeraExtension({ network: 'testnet' }).install()
        const pera = new PeraWalletConnect()

        await connectWithPeraExtension(pera)

        await expect(pera.getEmptySignatures('mainnet')).rejects.toMatchObject({
            data: { type: 'EMPTY_SIGNATURES_NETWORK_MISMATCH' },
        })
    })

    it('resolves {} from an extension that predates the method', async () => {
        new FakePeraExtension({ supportsEmptySignatures: false }).install()
        const pera = new PeraWalletConnect()

        await connectWithPeraExtension(pera)

        await expect(pera.getEmptySignatures()).resolves.toEqual({})
    })

    it('resolves {} for a Pera Web session', async () => {
        seedStoredWebSession(['WEB_ACCOUNT'])
        const pera = new PeraWalletConnect()

        await expect(pera.getEmptySignatures()).resolves.toEqual({})
    })
})
