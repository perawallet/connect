import algosdk from 'algosdk'
import nacl from 'tweetnacl'
import { describe, expect, it } from 'vitest'

import {
    verifyArc60Signature,
    verifyPeraSignature,
} from '../signatureVerification'

const account = algosdk.generateAccount()
const address = account.addr.toString()
const data = new Uint8Array([104, 101, 108, 108, 111])

async function sha256(bytes: Uint8Array) {
    return new Uint8Array(
        await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)),
    )
}

describe('verifyPeraSignature', () => {
    it('accepts a signature over "MX" || data', () => {
        const signature = algosdk.signBytes(data, account.sk)

        expect(verifyPeraSignature(data, signature, address)).toBe(true)
    })

    it('rejects a signature over the raw data', () => {
        const signature = nacl.sign.detached(data, account.sk)

        expect(verifyPeraSignature(data, signature, address)).toBe(false)
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
        const signature = nacl.sign.detached(signedBytes, account.sk)

        await expect(
            verifyArc60Signature(data, authenticatorData, signature, address),
        ).resolves.toBe(true)
    })

    it('rejects a signature over the raw data', async () => {
        const signature = nacl.sign.detached(data, account.sk)

        await expect(
            verifyArc60Signature(data, authenticatorData, signature, address),
        ).resolves.toBe(false)
    })
})
