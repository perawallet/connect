import { ed25519 } from '@noble/curves/ed25519.js'
import algosdk from 'algosdk'
import { Buffer } from 'buffer'
import { describe, expect, it } from 'vitest'

import {
    verifyArc60Signature,
    verifyPeraSignature,
} from '../signatureVerification.js'
import { PERA_WALLET_SIGNATURE_PREFIX } from '../../peraWalletConstants.js'

const account = algosdk.generateAccount()
const address = account.addr.toString()
const data = new Uint8Array([104, 101, 108, 108, 111])

async function sha256(bytes: Uint8Array) {
    return new Uint8Array(
        await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)),
    )
}

const ED25519_ORDER =
    2n ** 252n + 27_742_317_777_372_353_535_851_937_790_883_648_493n

function withMalleatedS(signature: Uint8Array) {
    const s = signature.slice(32).reverse()
    const sPlusOrder =
        BigInt(`0x${Buffer.from(s).toString('hex')}`) + ED25519_ORDER
    const bytes = Buffer.from(sPlusOrder.toString(16).padStart(64, '0'), 'hex')

    return new Uint8Array([...signature.slice(0, 32), ...bytes.reverse()])
}

describe('ed25519', () => {
    it('derives the key and signs byte-for-byte like algosdk', () => {
        const seed = account.sk.subarray(0, 32)

        expect(ed25519.getPublicKey(seed)).toEqual(account.sk.subarray(32))
        expect(
            ed25519.sign(
                new Uint8Array([...PERA_WALLET_SIGNATURE_PREFIX, ...data]),
                seed,
            ),
        ).toEqual(algosdk.signBytes(data, account.sk))
    })
})

describe('verifyPeraSignature', () => {
    it('accepts a signature over "MX" || data', () => {
        const signature = algosdk.signBytes(data, account.sk)

        expect(verifyPeraSignature(data, signature, address)).toBe(true)
    })

    it('rejects a signature over the raw data', () => {
        const signature = ed25519.sign(data, account.sk.subarray(0, 32))

        expect(verifyPeraSignature(data, signature, address)).toBe(false)
    })

    it.each([
        ['a string', 'hello', new TextEncoder().encode('hello')],
        ['an ArrayBuffer', data.slice().buffer, data],
        ['a number array', Array.from(data), data],
    ])(
        'checks plain-JS %s against the bytes the wallet signed',
        (_, plainJsInput, signedBytes) => {
            const signature = algosdk.signBytes(signedBytes, account.sk)

            expect(
                verifyPeraSignature(
                    plainJsInput as unknown as Uint8Array,
                    signature,
                    address,
                ),
            ).toBe(true)
        },
    )

    it('rejects a malleated signature (S + L)', () => {
        const signature = algosdk.signBytes(data, account.sk)

        expect(
            verifyPeraSignature(data, withMalleatedS(signature), address),
        ).toBe(false)
    })

    it('returns false for an invalid address instead of throwing', () => {
        const signature = algosdk.signBytes(data, account.sk)

        expect(verifyPeraSignature(data, signature, 'not-an-address')).toBe(
            false,
        )
    })
})

describe('verifyArc60Signature', () => {
    const authenticatorData = new Uint8Array([1, 2, 3])

    it('accepts a signature over sha256(data) || sha256(authenticatorData)', async () => {
        const signedBytes = new Uint8Array([
            ...(await sha256(data)),
            ...(await sha256(authenticatorData)),
        ])
        const signature = ed25519.sign(signedBytes, account.sk.subarray(0, 32))

        await expect(
            verifyArc60Signature(data, authenticatorData, signature, address),
        ).resolves.toBe(true)
    })

    it('hashes plain-JS string input as UTF-8, the bytes the wallet signed', async () => {
        const stringAuthenticatorData = 'auth' as unknown as Uint8Array
        const signedBytes = new Uint8Array([
            ...(await sha256(data)),
            ...(await sha256(new TextEncoder().encode('auth'))),
        ])
        const signature = ed25519.sign(signedBytes, account.sk.subarray(0, 32))

        await expect(
            verifyArc60Signature(
                data,
                stringAuthenticatorData,
                signature,
                address,
            ),
        ).resolves.toBe(true)
    })

    it('rejects a signature over the raw data', async () => {
        const signature = ed25519.sign(data, account.sk.subarray(0, 32))

        await expect(
            verifyArc60Signature(data, authenticatorData, signature, address),
        ).resolves.toBe(false)
    })

    it('returns false for an invalid signer address instead of throwing', async () => {
        const signature = ed25519.sign(data, account.sk.subarray(0, 32))

        await expect(
            verifyArc60Signature(
                data,
                authenticatorData,
                signature,
                'not-an-address',
            ),
        ).resolves.toBe(false)
    })
})
