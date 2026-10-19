import algosdk from 'algosdk'
import { Buffer } from 'buffer'

import {
    type PeraWalletArc60SignData,
    type PeraWalletArc60SignDataResponse,
    type SignMetadata,
} from '../util/model/peraWalletModels.js'
import { bytesToBase64 } from '../util/encoding/encodingUtils.js'

type Arc60WirePayload = Pick<
    PeraWalletArc60SignData,
    | 'data'
    | 'signer'
    | 'domain'
    | 'authenticatorData'
    | 'requestId'
    | 'hdPath'
    | 'scheme'
>

/** ARC-60 treats an omitted scheme as ed25519. */
function isEd25519Scheme(scheme: string | undefined) {
    return scheme === undefined || scheme === 'ed25519'
}

// Data is only re-encoded when the declared encoding is one Buffer understands
// and isn't already base64; anything else goes out untouched and is labelled
// base64 on the wire.
function shouldConvertEncoding(encoding: SignMetadata['encoding']) {
    return Buffer.isEncoding(encoding) && encoding !== 'base64'
}

/**
 * The bytes the wallet actually signs. Mirrors `buildArc60WireParams` — keep
 * the two in step, or local verification will hash different bytes than the
 * wallet did.
 */
function decodeArc60SignedData(
    data: string,
    encoding: SignMetadata['encoding'],
): Buffer {
    return shouldConvertEncoding(encoding)
        ? Buffer.from(data, encoding)
        : Buffer.from(data, 'base64')
}

// The extension and the mobile wallet both speak ARC-60 over `algo_signData`
// with an object payload (rather than the array shape used for arbitrary-data
// signing); this is the wire representation shared by both transports.
function buildArc60WireParams(
    payload: Arc60WirePayload,
    metadata: SignMetadata,
): Record<string, unknown> {
    const dataBase64 = shouldConvertEncoding(metadata.encoding)
        ? Buffer.from(payload.data, metadata.encoding).toString('base64')
        : payload.data

    // An ed25519 request goes out exactly as before any scheme existed. Another
    // scheme's key isn't an address (a Falcon address is a hash of its key), so
    // it goes as base64 with the scheme beside it, for the wallet to check.
    const isEd25519 = isEd25519Scheme(payload.scheme)

    const wireParams: Record<string, unknown> = {
        data: dataBase64,
        signer: isEd25519
            ? algosdk.encodeAddress(payload.signer)
            : bytesToBase64(payload.signer),
        domain: payload.domain,
        authenticatorData: bytesToBase64(payload.authenticatorData),
        metadata: {
            scope: metadata.scope,
            encoding: 'base64',
        },
    }

    if (payload.requestId !== undefined)
        wireParams.requestId = payload.requestId
    if (payload.hdPath !== undefined) wireParams.hdPath = payload.hdPath
    if (!isEd25519) wireParams.scheme = payload.scheme

    return wireParams
}

function buildArc60SignDataResponse(
    payload: Arc60WirePayload,
    signature: Uint8Array,
): PeraWalletArc60SignDataResponse {
    return {
        data: payload.data,
        signer: payload.signer,
        domain: payload.domain,
        authenticatorData: payload.authenticatorData,
        ...(payload.requestId !== undefined && {
            requestId: payload.requestId,
        }),
        ...(payload.hdPath !== undefined && { hdPath: payload.hdPath }),
        ...(payload.scheme !== undefined && { scheme: payload.scheme }),
        signature,
    }
}

export {
    buildArc60WireParams,
    buildArc60SignDataResponse,
    decodeArc60SignedData,
    isEd25519Scheme,
}
