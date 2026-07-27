import algosdk from "algosdk";

import {
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  SignMetadata
} from "../util/model/peraWalletModels";

type Arc60WirePayload = Pick<
  PeraWalletArc60SignData,
  "data" | "signer" | "domain" | "authenticatorData" | "requestId" | "hdPath"
>;

// Data is only re-encoded when the declared encoding is one Buffer understands
// and isn't already base64; anything else goes out untouched and is labelled
// base64 on the wire.
function shouldConvertEncoding(encoding: SignMetadata["encoding"]) {
  return Buffer.isEncoding(encoding) && encoding !== "base64";
}

/**
 * The bytes the wallet actually signs. Mirrors `buildArc60WireParams` — keep
 * the two in step, or local verification will hash different bytes than the
 * wallet did.
 */
function decodeArc60SignedData(data: string, encoding: SignMetadata["encoding"]): Buffer {
  return shouldConvertEncoding(encoding)
    ? Buffer.from(data, encoding as BufferEncoding)
    : Buffer.from(data, "base64");
}

// The extension and the mobile wallet both speak ARC-60 over `algo_signData`
// with an object payload (rather than the array shape used for arbitrary-data
// signing); this is the wire representation shared by both transports.
function buildArc60WireParams(
  payload: Arc60WirePayload,
  metadata: SignMetadata
): Record<string, unknown> {
  // force encoding to base64 for future proofing
  const dataBase64 = shouldConvertEncoding(metadata.encoding)
    ? Buffer.from(payload.data, metadata.encoding as BufferEncoding).toString("base64")
    : payload.data;

  const wireParams: Record<string, unknown> = {
    data: dataBase64,
    signer: algosdk.encodeAddress(payload.signer),
    domain: payload.domain,
    authenticatorData: Buffer.from(payload.authenticatorData).toString("base64"),
    metadata: {
      scope: metadata.scope,
      encoding: "base64"
    }
  };

  if (payload.requestId !== undefined) wireParams.requestId = payload.requestId;
  if (payload.hdPath !== undefined) wireParams.hdPath = payload.hdPath;

  return wireParams;
}

function buildArc60SignDataResponse(
  payload: Arc60WirePayload,
  signature: Uint8Array
): PeraWalletArc60SignDataResponse {
  return {
    data: payload.data,
    signer: payload.signer,
    domain: payload.domain,
    authenticatorData: payload.authenticatorData,
    ...(payload.requestId !== undefined && {requestId: payload.requestId}),
    ...(payload.hdPath !== undefined && {hdPath: payload.hdPath}),
    signature
  };
}

export {buildArc60WireParams, buildArc60SignDataResponse, decodeArc60SignedData};
