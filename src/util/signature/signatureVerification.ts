import algosdk from 'algosdk'
import { Buffer } from 'buffer'
import nacl from 'tweetnacl'

import { concatArrays } from '../array/arrayUtils.js'
import { PERA_WALLET_SIGNATURE_PREFIX } from '../peraWalletConstants.js'

// Read through Buffer.from like the wire encoding (bytesToBase64), so plain-JS
// input such as a string hashes the same bytes the wallet signed.
async function sha256(data: Uint8Array) {
    return new Uint8Array(
        await crypto.subtle.digest(
            'SHA-256',
            new Uint8Array(Buffer.from(data)),
        ),
    )
}

// Arbitrary-data signatures cover `"MX" || data`, the same domain separation
// algosdk's signBytes uses.
function verifyPeraSignature(
    data: Uint8Array,
    signature: Uint8Array,
    signerAddress: string,
): boolean {
    try {
        const { publicKey } = algosdk.decodeAddress(signerAddress)

        return nacl.sign.detached.verify(
            concatArrays(PERA_WALLET_SIGNATURE_PREFIX, data),
            signature,
            publicKey,
        )
    } catch {
        return false
    }
}

// ARC-60 signs `sha256(data) || sha256(authenticatorData)`, not `data` itself.
async function verifyArc60Signature(
    data: Uint8Array,
    authenticatorData: Uint8Array,
    signature: Uint8Array,
    signerAddress: string,
): Promise<boolean> {
    try {
        const { publicKey } = algosdk.decodeAddress(signerAddress)
        const signedBytes = concatArrays(
            await sha256(data),
            await sha256(authenticatorData),
        )

        return nacl.sign.detached.verify(signedBytes, signature, publicKey)
    } catch {
        return false
    }
}

export { verifyArc60Signature, verifyPeraSignature }
