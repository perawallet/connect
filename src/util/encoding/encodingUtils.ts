import { Buffer } from 'buffer'

// Typed as bytes, but plain-JS dApps also pass ArrayBuffers, number arrays and
// strings (UTF-8). Buffer.from accepts all of them, as the global Buffer the
// SDK used to rely on did, so those keep signing what they always signed.
function bytesToBase64(data: Uint8Array): string {
    return Buffer.from(data).toString('base64')
}

export { bytesToBase64 }
