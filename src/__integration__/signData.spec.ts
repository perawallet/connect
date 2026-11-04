import algosdk from 'algosdk'
import { describe, expect, it, vi } from 'vitest'

import {
    PeraWalletConnect,
    ScopeType,
    type PeraWalletArc60SignData,
    type Siwa,
} from '../index.js'
import { useIntegrationEnvironment } from './harness/environment.js'
import { FakePeraExtension } from './harness/fakePeraExtension.js'
import { FakePeraMobile } from './harness/fakePeraMobile.js'
import { walletConnectRelay } from './harness/fakeWalletConnect.js'
import {
    connectWithPeraExtension,
    connectWithPeraMobile,
} from './harness/flows.js'
import { tick } from './harness/flush.js'
import { getSignTxnToast } from './harness/modalDom.js'
import { buildAuthenticatorData } from './harness/walletCrypto.js'

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

const encoder = new TextEncoder()
const ARC60_METADATA = { scope: ScopeType.AUTH, encoding: 'base64' }

async function buildSiwaPayload(
    accountAddress: string,
    domain = window.location.origin,
): Promise<PeraWalletArc60SignData> {
    const siwa: Siwa = {
        domain: new URL(window.location.origin).host,
        account_address: accountAddress,
        uri: window.location.origin,
        version: '1',
        chain_id: '283',
        type: 'ed25519',
        statement: 'Sign in to the integration suite',
        nonce: 'n0nce',
        'issued-at': '2026-01-01T00:00:00Z',
    }

    return {
        data: algosdk.bytesToBase64(encoder.encode(JSON.stringify(siwa))),
        signer: algosdk.decodeAddress(accountAddress).publicKey,
        domain,
        authenticatorData: await buildAuthenticatorData(domain),
    }
}

describe('Sign arbitrary data', () => {
    const environment = useIntegrationEnvironment()

    it('resolves signatures over "MX" + data that verify against the signer', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const [signer] = mobile.addresses
        const items = [
            { data: encoder.encode('first'), message: 'Log in' },
            { data: encoder.encode('second'), message: 'Confirm' },
        ]

        await connectWithPeraMobile(pera, mobile)
        environment.network.setAlgodAccount(signer)

        const signing = pera.signData(items, signer, true)
        const relayed = await mobile.approveNextRequest()
        const signatures = await signing

        expect(signatures).toHaveLength(2)
        signatures.forEach((signature, index) => {
            expect(
                algosdk.verifyBytes(items[index].data, signature, signer),
            ).toBe(true)
            expect(
                pera.verifySignature(items[index].data, signature, signer),
            ).toBe(true)
        })
        expect(relayed.request).toMatchObject({
            method: 'algo_signData',
            params: [
                {
                    data: algosdk.bytesToBase64(items[0].data),
                    message: 'Log in',
                    signer,
                    chainId: 4160,
                },
                { message: 'Confirm', signer },
            ],
        })
        expect(getSignTxnToast()).toBeNull()
    })

    it("verifies a rekeyed account's signature against its auth address from algod", async () => {
        const mobile = new FakePeraMobile(2)
        const pera = new PeraWalletConnect()
        const [rekeyed, authAccount] = mobile.addresses
        const data = encoder.encode('rekeyed account')

        await connectWithPeraMobile(pera, mobile)
        mobile.rekey(rekeyed, authAccount)
        environment.network.setAlgodAccount(rekeyed, { authAddr: authAccount })

        const signing = pera.signData(
            [{ data, message: 'Rekeyed' }],
            rekeyed,
            true,
        )
        await mobile.approveNextRequest()
        const [signature] = await signing

        expect(algosdk.verifyBytes(data, signature, authAccount)).toBe(true)
        expect(algosdk.verifyBytes(data, signature, rekeyed)).toBe(false)
        // An all-networks session (4160) reads mainnet for this lookup.
        expect(environment.network.requestedUrls).toContainEqual(
            expect.stringContaining(
                `mainnet-api.algonode.cloud/v2/accounts/${rekeyed}`,
            ),
        )
    })

    it('rejects with SIGN_DATA_VERIFICATION_FAILED when the signature is not the signer’s', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const [signer] = mobile.addresses
        const impostor = algosdk.generateAccount()
        const data = encoder.encode('verify me')

        await connectWithPeraMobile(pera, mobile)
        environment.network.setAlgodAccount(signer)

        const signing = pera.signData(
            [{ data, message: 'Check' }],
            signer,
            true,
        )
        signing.catch(() => undefined)
        await mobile.approveNextRequest(() => [
            algosdk.bytesToBase64(algosdk.signBytes(data, impostor.sk)),
        ])

        await expect(signing).rejects.toMatchObject({
            data: { type: 'SIGN_DATA_VERIFICATION_FAILED' },
        })
    })

    it('signs and verifies through the extension', async () => {
        const extension = new FakePeraExtension().install()
        const pera = new PeraWalletConnect()
        const [signer] = extension.addresses
        const data = encoder.encode('extension data')

        await connectWithPeraExtension(pera)
        environment.network.setAlgodAccount(signer)

        const [signature] = await pera.signData(
            [{ data, message: 'Sign' }],
            signer,
            true,
        )

        expect(algosdk.verifyBytes(data, signature, signer)).toBe(true)
        expect(extension.signData).toHaveBeenCalledWith({
            data: [
                {
                    signer,
                    data: algosdk.bytesToBase64(data),
                    message: 'Sign',
                },
            ],
        })
    })
})

describe('Sign an ARC-60 (SIWA) payload', () => {
    useIntegrationEnvironment()

    it('resolves a verified response from Pera Mobile for the page origin', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const [account] = mobile.addresses
        const payload = await buildSiwaPayload(account)

        await connectWithPeraMobile(pera, mobile)

        const signing = pera.signArc60Data(payload, ARC60_METADATA, true)
        const relayed = await mobile.approveNextRequest()
        const response = await signing

        expect(response).toMatchObject({
            data: payload.data,
            signer: payload.signer,
            domain: window.location.origin,
            authenticatorData: payload.authenticatorData,
        })
        await expect(
            pera.verifyArc60Signature(
                algosdk.base64ToBytes(payload.data),
                payload.authenticatorData,
                response.signature,
                account,
            ),
        ).resolves.toBe(true)
        // One object, not an array, so Pera routes it to the ARC-60 handler.
        expect(relayed.request).toMatchObject({
            method: 'algo_signData',
            params: {
                data: payload.data,
                signer: account,
                domain: window.location.origin,
                authenticatorData: algosdk.bytesToBase64(
                    payload.authenticatorData,
                ),
                metadata: { scope: ScopeType.AUTH, encoding: 'base64' },
            },
        })
    })

    it('rejects with SIGN_DATA_DOMAIN_MISMATCH before contacting the wallet', async () => {
        const mobile = new FakePeraMobile()
        const pera = new PeraWalletConnect()
        const payload = await buildSiwaPayload(
            mobile.addresses[0],
            'https://evil.example',
        )

        await connectWithPeraMobile(pera, mobile)

        await expect(
            pera.signArc60Data(payload, ARC60_METADATA, true),
        ).rejects.toMatchObject({
            data: { type: 'SIGN_DATA_DOMAIN_MISMATCH' },
        })
        await tick()
        expect(walletConnectRelay.requests).toHaveLength(0)
        expect(getSignTxnToast()).toBeNull()
    })

    it('resolves a verified response from the extension', async () => {
        const extension = new FakePeraExtension().install()
        const pera = new PeraWalletConnect()
        const [account] = extension.addresses
        const payload = await buildSiwaPayload(account)

        await connectWithPeraExtension(pera)

        const response = await pera.signArc60Data(payload, ARC60_METADATA, true)

        await expect(
            pera.verifyArc60Signature(
                algosdk.base64ToBytes(payload.data),
                payload.authenticatorData,
                response.signature,
                account,
            ),
        ).resolves.toBe(true)
        expect(extension.signData).toHaveBeenCalledWith(
            expect.objectContaining({
                signer: account,
                domain: window.location.origin,
            }),
        )
    })
})
