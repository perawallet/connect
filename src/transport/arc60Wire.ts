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

// The extension and the mobile wallet both speak ARC-60 over `algo_signData`
// with an object payload (rather than the array shape used for arbitrary-data
// signing); this is the wire representation shared by both transports.
function buildArc60WireParams(
  payload: Arc60WirePayload,
  metadata: SignMetadata
): Record<string, unknown> {
  // force encoding to base64 for future proofing
  const dataBase64 =
    Buffer.isEncoding(metadata.encoding) && metadata.encoding !== "base64"
      ? Buffer.from(payload.data, metadata.encoding).toString("base64")
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

export {buildArc60WireParams, buildArc60SignDataResponse};
