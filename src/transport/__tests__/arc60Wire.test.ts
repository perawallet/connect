import {describe, it, expect} from "vitest";
import algosdk from "algosdk";

import {buildArc60WireParams, buildArc60SignDataResponse} from "../arc60Wire";
import {ScopeType} from "../../util/model/peraWalletModels";

const account = algosdk.generateAccount();

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    data: Buffer.from(new Uint8Array([1, 2])).toString("base64"),
    signer: algosdk.decodeAddress(account.addr.toString()).publicKey,
    domain: "example.com",
    authenticatorData: new Uint8Array(37),
    ...overrides
  };
}

describe("buildArc60WireParams", () => {
  it("passes base64 data through unchanged", () => {
    const payload = makePayload();
    const params = buildArc60WireParams(payload, {
      scope: ScopeType.AUTH,
      encoding: "base64"
    });

    expect(params.data).toBe(payload.data);
  });

  it("re-encodes non-base64 data to base64", () => {
    const raw = new Uint8Array([1, 2, 3]);
    const payload = makePayload({data: Buffer.from(raw).toString("hex")});

    const params = buildArc60WireParams(payload, {
      scope: ScopeType.AUTH,
      encoding: "hex"
    });

    expect(params.data).toBe(Buffer.from(raw).toString("base64"));
  });

  it("encodes the signer as a base32 Algorand address string", () => {
    const payload = makePayload();
    const params = buildArc60WireParams(payload, {
      scope: ScopeType.AUTH,
      encoding: "base64"
    });

    expect(params.signer).toBe(account.addr.toString());
  });

  it("base64-encodes authenticatorData and nests scope/encoding under metadata", () => {
    const payload = makePayload({authenticatorData: new Uint8Array([9, 9])});
    const params = buildArc60WireParams(payload, {
      scope: ScopeType.AUTH,
      encoding: "base64"
    });

    expect(params.authenticatorData).toBe(Buffer.from([9, 9]).toString("base64"));
    expect(params.metadata).toEqual({scope: ScopeType.AUTH, encoding: "base64"});
  });

  it("omits requestId/hdPath when absent and includes them when present", () => {
    const withoutOptional = buildArc60WireParams(makePayload(), {
      scope: ScopeType.AUTH,
      encoding: "base64"
    });

    expect(withoutOptional).not.toHaveProperty("requestId");
    expect(withoutOptional).not.toHaveProperty("hdPath");

    const withOptional = buildArc60WireParams(
      makePayload({requestId: "req-1", hdPath: "m/44'/283'/0'/0/0"}),
      {scope: ScopeType.AUTH, encoding: "base64"}
    );

    expect(withOptional.requestId).toBe("req-1");
    expect(withOptional.hdPath).toBe("m/44'/283'/0'/0/0");
  });

  // ARC-60 schemes (algorandfoundation/ARCs#494), as use-wallet 5.1 and Lute send them.
  describe("scheme", () => {
    const metadata = {scope: ScopeType.AUTH, encoding: "base64"};
    const falconKey = new Uint8Array(1793).fill(5);

    it("sends a non-ed25519 signer as base64 of its key, with the scheme", () => {
      const params = buildArc60WireParams(
        makePayload({signer: falconKey, scheme: "falcon-1024-det"}),
        metadata
      );

      expect(params.signer).toBe(Buffer.from(falconKey).toString("base64"));
      expect(params.scheme).toBe("falcon-1024-det");
    });

    it("sends an explicit ed25519 request exactly like one without a scheme", () => {
      expect(buildArc60WireParams(makePayload({scheme: "ed25519"}), metadata)).toEqual(
        buildArc60WireParams(makePayload(), metadata)
      );
    });
  });
});

describe("buildArc60SignDataResponse", () => {
  it("builds a response mirroring the payload plus the signature", () => {
    const payload = makePayload();
    const signature = new Uint8Array([9, 9]);

    const response = buildArc60SignDataResponse(payload, signature);

    expect(response).toEqual({
      data: payload.data,
      signer: payload.signer,
      domain: payload.domain,
      authenticatorData: payload.authenticatorData,
      signature
    });
  });

  it("passes requestId/hdPath through when present, and omits them otherwise", () => {
    const signature = new Uint8Array([1]);

    const withoutOptional = buildArc60SignDataResponse(makePayload(), signature);

    expect(withoutOptional).not.toHaveProperty("requestId");
    expect(withoutOptional).not.toHaveProperty("hdPath");

    const withOptional = buildArc60SignDataResponse(
      makePayload({requestId: "req-1", hdPath: "m/44'/283'/0'/0/0"}),
      signature
    );

    expect(withOptional.requestId).toBe("req-1");
    expect(withOptional.hdPath).toBe("m/44'/283'/0'/0/0");
  });

  it("passes the scheme through when present", () => {
    const response = buildArc60SignDataResponse(
      makePayload({scheme: "falcon-1024-det"}),
      new Uint8Array([1])
    );

    expect(response.scheme).toBe("falcon-1024-det");
  });
});
