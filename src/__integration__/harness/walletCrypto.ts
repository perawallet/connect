import algosdk from 'algosdk'
import nacl from 'tweetnacl'

// What a real wallet does with its keys, so the SDK's checks run against real
// signatures rather than placeholders.

async function sha256(data: Uint8Array) {
    return new Uint8Array(
        await crypto.subtle.digest('SHA-256', new Uint8Array(data)),
    )
}

function concatBytes(...parts: Uint8Array[]) {
    const result = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0))
    let offset = 0

    for (const part of parts) {
        result.set(part, offset)
        offset += part.length
    }

    return result
}

/** ARC-60: `ed25519(sha256(data) || sha256(authenticatorData))`. */
async function signArc60(
    data: Uint8Array,
    authenticatorData: Uint8Array,
    secretKey: Uint8Array,
) {
    const signedBytes = concatBytes(
        await sha256(data),
        await sha256(authenticatorData),
    )

    return nacl.sign.detached(signedBytes, secretKey)
}

/** FIDO-style authenticator data: sha256(domain), flags, a zero counter. */
async function buildAuthenticatorData(domain: string) {
    return concatBytes(
        await sha256(new TextEncoder().encode(domain)),
        new Uint8Array([0x41]),
        new Uint8Array(4),
    )
}

/**
 * A `SignedTransaction` without `txn`, as use-wallet expects for an account
 * with a plain ed25519 key.
 */
function buildEmptySignature() {
    return algosdk.bytesToBase64(
        algosdk.msgpackRawEncode({ sig: new Uint8Array(64) }),
    )
}

function signWalletTransaction(base64Txn: string, secretKey: Uint8Array) {
    const txn = algosdk.decodeUnsignedTransaction(
        algosdk.base64ToBytes(base64Txn),
    )

    return algosdk.bytesToBase64(txn.signTxn(secretKey))
}

function senderOf(base64Txn: string) {
    return algosdk
        .decodeUnsignedTransaction(algosdk.base64ToBytes(base64Txn))
        .sender.toString()
}

/** Whether `signedTxn` carries a valid signature by `address` over its txn. */
function hasValidSignatureBy(signedTxn: Uint8Array, address: string) {
    const { txn, sig } = algosdk.decodeSignedTransaction(signedTxn)

    return (
        sig !== undefined &&
        nacl.sign.detached.verify(
            txn.bytesToSign(),
            sig,
            algosdk.decodeAddress(address).publicKey,
        )
    )
}

export {
    buildAuthenticatorData,
    buildEmptySignature,
    hasValidSignatureBy,
    senderOf,
    sha256,
    signArc60,
    signWalletTransaction,
}
