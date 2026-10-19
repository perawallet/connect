import algosdk from 'algosdk'
import { describe, expect, it, vi } from 'vitest'

import { PeraWalletConnect } from '../index.js'
import {
    useIntegrationEnvironment,
    useMobileUserAgent,
} from './harness/environment.js'
import { FakePeraMobile } from './harness/fakePeraMobile.js'
import { walletConnectRelay } from './harness/fakeWalletConnect.js'
import { connectWithPeraMobile, openConnectModal } from './harness/flows.js'
import {
    getConnectModalUri,
    getLaunchPeraWalletLink,
    getRedirectModal,
    getSignTxnToast,
} from './harness/modalDom.js'
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

// The webview probe waits this long for a Pera in-app browser to answer; a
// plain mobile browser never does.
const WEBVIEW_PROBE_TIMEOUT_MS = 2000

const RECEIVER = algosdk.generateAccount().addr.toString()

async function connectedPera(
    mobile: FakePeraMobile,
    options?: ConstructorParameters<typeof PeraWalletConnect>[0],
) {
    const pera = new PeraWalletConnect(options)

    await connectWithPeraMobile(pera, mobile)

    return pera
}

describe('Sign transactions with Pera Mobile', () => {
    const environment = useIntegrationEnvironment()

    it('shows the sign toast on desktop until Pera answers, then resolves the signed transactions', async () => {
        const mobile = new FakePeraMobile(2)
        const pera = await connectedPera(mobile)
        const [first, second] = mobile.addresses
        const txns = [
            makePayment(first, RECEIVER),
            makePayment(second, RECEIVER),
        ]
        algosdk.assignGroupID(txns)

        const signing = pera.signTransaction([txns.map(txn => ({ txn }))])
        const relayed = await mobile.waitForRequest()

        expect(getSignTxnToast()).not.toBeNull()

        await mobile.approveNextRequest()
        const signed = await signing

        expect(getSignTxnToast()).toBeNull()
        expect(signed).toHaveLength(2)
        expect(hasValidSignatureBy(signed[0], first)).toBe(true)
        expect(hasValidSignatureBy(signed[1], second)).toBe(true)
        expect(algosdk.decodeSignedTransaction(signed[1]).txn.txID()).toBe(
            txns[1].txID(),
        )
        expect(relayed.request).toMatchObject({
            jsonrpc: '2.0',
            method: 'algo_signTxn',
            params: [
                txns.map(txn => ({
                    txn: algosdk.bytesToBase64(
                        algosdk.encodeUnsignedTransaction(txn),
                    ),
                })),
            ],
        })
        expect(relayed.options).toEqual({ forcePushNotification: true })
    })

    it('does not push-notify the phone when the config asks for silent requests', async () => {
        environment.network.config.silent = true
        const mobile = new FakePeraMobile()
        const pera = await connectedPera(mobile)

        const signing = pera.signTransaction([
            [{ txn: makePayment(mobile.addresses[0], RECEIVER) }],
        ])
        const relayed = await mobile.approveNextRequest()
        await signing

        expect(relayed.options).toEqual({ forcePushNotification: false })
    })

    it('shows no toast when shouldShowSignTxnToast is false', async () => {
        const mobile = new FakePeraMobile()
        const pera = await connectedPera(mobile, {
            shouldShowSignTxnToast: false,
        })

        const signing = pera.signTransaction([
            [{ txn: makePayment(mobile.addresses[0], RECEIVER) }],
        ])
        await mobile.waitForRequest()

        expect(getSignTxnToast()).toBeNull()

        await mobile.approveNextRequest()
        await expect(signing).resolves.toHaveLength(1)
    })

    it('leaves out a transaction marked signers: [] and returns only the signed ones', async () => {
        const mobile = new FakePeraMobile()
        const pera = await connectedPera(mobile)
        const outsider = algosdk.generateAccount()
        const ours = makePayment(mobile.addresses[0], RECEIVER)
        const theirs = makePayment(outsider.addr.toString(), RECEIVER)
        algosdk.assignGroupID([ours, theirs])

        const signing = pera.signTransaction([
            [{ txn: ours }, { txn: theirs, signers: [] }],
        ])
        await mobile.approveNextRequest()
        const signed = await signing

        expect(signed).toHaveLength(1)
        expect(hasValidSignatureBy(signed[0], mobile.addresses[0])).toBe(true)
    })

    it('rejects with SIGN_TRANSACTIONS when Pera returns a different transaction', async () => {
        const mobile = new FakePeraMobile()
        const pera = await connectedPera(mobile)
        const [sender] = mobile.addresses
        const attacker = algosdk.generateAccount().addr.toString()

        const signing = pera.signTransaction([
            [{ txn: makePayment(sender, RECEIVER, 1000) }],
        ])
        signing.catch(() => undefined)
        await mobile.approveNextRequest(() => [
            algosdk.bytesToBase64(
                makePayment(sender, attacker, 1000).signTxn(
                    mobile.accounts[0].sk,
                ),
            ),
        ])

        await expect(signing).rejects.toMatchObject({
            name: 'PeraWalletConnectError',
            data: { type: 'SIGN_TRANSACTIONS' },
        })
        expect(getSignTxnToast()).toBeNull()
    })

    it('rejects with SIGN_TRANSACTIONS and removes the toast when the user declines in Pera', async () => {
        const mobile = new FakePeraMobile()
        const pera = await connectedPera(mobile)

        const signing = pera.signTransaction([
            [{ txn: makePayment(mobile.addresses[0], RECEIVER) }],
        ])
        signing.catch(() => undefined)
        await mobile.rejectNextRequest(
            new Error('Transaction Request Rejected'),
        )

        await expect(signing).rejects.toMatchObject({
            data: { type: 'SIGN_TRANSACTIONS' },
            message: 'Transaction Request Rejected',
        })
        expect(getSignTxnToast()).toBeNull()
    })

    it('signs only the requested slots of an AtomicTransactionComposer group in one request', async () => {
        const mobile = new FakePeraMobile(2)
        const pera = await connectedPera(mobile)
        const [walletA, walletB] = mobile.addresses
        const local = algosdk.generateAccount()
        const localAddress = local.addr.toString()
        const atc = new algosdk.AtomicTransactionComposer()

        atc.addTransaction({
            txn: makePayment(walletA, localAddress),
            signer: pera.transactionSigner,
        })
        atc.addTransaction({
            txn: makePayment(localAddress, walletA),
            signer: algosdk.makeBasicAccountTransactionSigner(local),
        })
        atc.addTransaction({
            txn: makePayment(walletB, localAddress),
            signer: pera.transactionSigner,
        })

        const gathering = atc.gatherSignatures()
        const relayed = await mobile.approveNextRequest()
        const signed = await gathering

        expect(walletConnectRelay.requests).toHaveLength(0)
        const [requestedGroup] = relayed.request.params as [
            { signers?: string[] }[],
        ]
        expect(requestedGroup.map(txn => txn.signers)).toEqual([
            undefined,
            [],
            undefined,
        ])
        expect(hasValidSignatureBy(signed[0], walletA)).toBe(true)
        expect(hasValidSignatureBy(signed[1], localAddress)).toBe(true)
        expect(hasValidSignatureBy(signed[2], walletB)).toBe(true)
        const groups = signed.map(blob =>
            algosdk.bytesToBase64(
                algosdk.decodeSignedTransaction(blob).txn.group!,
            ),
        )
        expect(new Set(groups).size).toBe(1)
    })

    it('opens the redirect modal on a phone until Pera answers', async () => {
        vi.useFakeTimers()
        useMobileUserAgent()
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        await vi.advanceTimersByTimeAsync(WEBVIEW_PROBE_TIMEOUT_MS)

        const { connecting } = await openConnectModal(pera)
        const uri = getConnectModalUri()

        // Touch-screen mode: no QR code, a button that deep-links into Pera.
        expect(getLaunchPeraWalletLink().getAttribute('href')).toContain(
            encodeURIComponent(uri),
        )

        mobile.scanQrCode(uri)
        await connecting

        const signing = pera.signTransaction([
            [{ txn: makePayment(mobile.addresses[0], RECEIVER) }],
        ])
        await mobile.waitForRequest()

        expect(getRedirectModal()).not.toBeNull()
        expect(getSignTxnToast()).toBeNull()

        await mobile.approveNextRequest()
        await expect(signing).resolves.toHaveLength(1)
        expect(getRedirectModal()).toBeNull()
    })
})
