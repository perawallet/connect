import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";

import {ExtensionTransport} from "../ExtensionTransport";
import {Arc0027RequestError} from "../arc0027Client";
import {ARC0027_ERROR_CODES} from "../arc0027Types";
import {ScopeType} from "../../../util/model/peraWalletModels";
import {
  saveWalletDetailsToStorage,
  getWalletDetailsFromStorage,
  resetWalletDetailsFromStorage
} from "../../../util/storage/storageUtils";

// A generated account gives us a real address for signer fields.
const account = algosdk.generateAccount();

function makeClient(request: any, discover: any = vi.fn()) {
  return {request, discover} as any;
}

describe("ExtensionTransport", () => {
  afterEach(() => resetWalletDetailsFromStorage());

  it("connect() enables and returns accounts", async () => {
    const client = makeClient(
      vi.fn().mockResolvedValue({accounts: [{address: account.addr}]})
    );
    const transport = new ExtensionTransport(client);

    const accounts = await transport.connect();

    expect(accounts).toEqual([account.addr]);
    expect(client.request).toHaveBeenCalledWith("enable", expect.any(Object));
  });

  it("signTransaction() decodes base64 stxns to Uint8Array", async () => {
    const b64 = Buffer.from([1, 2, 3]).toString("base64");
    const client = makeClient(vi.fn().mockResolvedValue({stxns: [b64]}));
    const transport = new ExtensionTransport(client);

    const signed = await transport.signTransaction([{txn: "AA=="}]);

    expect(Array.from(signed[0])).toEqual([1, 2, 3]);
  });

  it("signData() fails fast with EXTENSION_UNSUPPORTED_OPERATION", async () => {
    const client = makeClient(vi.fn());
    const transport = new ExtensionTransport(client);

    // eslint-disable-next-line no-magic-numbers
    await expect(
      transport.signData([{data: new Uint8Array([1]), message: "m"}], account.addr, 4160)
    ).rejects.toMatchObject({data: {type: "EXTENSION_UNSUPPORTED_OPERATION"}});
    expect(client.request).not.toHaveBeenCalled();
  });

  it("signArc60Data() sends the ARC-60 wire shape as sign_message params", async () => {
    const sigB64 = Buffer.from([9, 9]).toString("base64");
    const requestFn = vi.fn().mockResolvedValue({signature: sigB64});
    const transport = new ExtensionTransport(makeClient(requestFn));

    // domain must match window.location.origin (jsdom default: http://localhost)
    const domain = window.location.origin;
    // signer is the raw Ed25519 public key, per PeraWalletArc60SignData —
    // the same shape every caller (e.g. the demo dapp's buildArc60Payload)
    // constructs via algosdk.decodeAddress(address).publicKey.
    const signerPublicKey = algosdk.decodeAddress(account.addr.toString()).publicKey;

    await transport.signArc60Data(
      {
        data: Buffer.from(new Uint8Array([1, 2])).toString("base64"),
        signer: signerPublicKey,
        domain,
        authenticatorData: new Uint8Array(37)
      },
      {scope: ScopeType.AUTH, encoding: "base64"}
    );

    const [method, params] = requestFn.mock.calls[0];

    expect(method).toBe("sign_message");
    // base64
    expect(typeof params.data).toBe("string");
    // base64
    expect(typeof params.authenticatorData).toBe("string");
    // signer must go over the wire as a base32 Algorand address string (what
    // the extension's arc60WireSchema validates), not the raw public key
    // bytes — see MobileTransport/PeraWalletConnect.ts, which both encode.
    expect(typeof params.signer).toBe("string");
    expect(params.signer).toBe(account.addr.toString());
    expect(params.metadata).toEqual({scope: ScopeType.AUTH, encoding: "base64"});
  });

  it("signArc60Data() resolves with the original raw signer public key bytes", async () => {
    const sigB64 = Buffer.from([9, 9]).toString("base64");
    const requestFn = vi.fn().mockResolvedValue({signature: sigB64});
    const transport = new ExtensionTransport(makeClient(requestFn));
    const domain = window.location.origin;
    const signerPublicKey = algosdk.decodeAddress(account.addr.toString()).publicKey;

    const response = await transport.signArc60Data(
      {
        data: new Uint8Array([1, 2]),
        signer: signerPublicKey,
        domain,
        authenticatorData: new Uint8Array(37)
      },
      {scope: ScopeType.AUTH, encoding: "base64"}
    );

    expect(response.signer).toEqual(signerPublicKey);
  });

  it("signArc60Data() re-encodes non-base64 payload data to base64 on the wire", async () => {
    const raw = new Uint8Array([1, 2, 3]);
    const requestFn = vi
      .fn()
      .mockResolvedValue({signature: Buffer.from([9]).toString("base64")});
    const transport = new ExtensionTransport(makeClient(requestFn));

    await transport.signArc60Data(
      {
        data: Buffer.from(raw).toString("hex"),
        signer: algosdk.decodeAddress(account.addr.toString()).publicKey,
        domain: window.location.origin,
        authenticatorData: new Uint8Array(37)
      },
      {scope: ScopeType.AUTH, encoding: "hex"}
    );

    const [, params] = requestFn.mock.calls[0];

    expect(params.data).toBe(Buffer.from(raw).toString("base64"));
  });

  it("signArc60Data() maps a request failure through mapError", async () => {
    const requestFn = vi
      .fn()
      .mockRejectedValue(
        new Arc0027RequestError(ARC0027_ERROR_CODES.MethodCanceledError, "closed")
      );
    const transport = new ExtensionTransport(makeClient(requestFn));

    await expect(
      transport.signArc60Data(
        {
          data: Buffer.from(new Uint8Array([1])).toString("base64"),
          signer: algosdk.decodeAddress(account.addr.toString()).publicKey,
          domain: window.location.origin,
          authenticatorData: new Uint8Array(37)
        },
        {scope: ScopeType.AUTH, encoding: "base64"}
      )
    ).rejects.toMatchObject({data: {type: "SIGN_TXN_CANCELLED"}});
  });

  it("signArc60Data() rejects on origin mismatch before calling the extension", async () => {
    const requestFn = vi.fn();
    const transport = new ExtensionTransport(makeClient(requestFn));

    await expect(
      transport.signArc60Data(
        {
          data: new Uint8Array([1]),
          signer: account.addr,
          domain: "https://evil.example",
          authenticatorData: new Uint8Array(37)
        },
        {scope: ScopeType.AUTH, encoding: "base64"}
      )
    ).rejects.toMatchObject({data: {type: "SIGN_DATA_DOMAIN_MISMATCH"}});
    expect(requestFn).not.toHaveBeenCalled();
  });

  describe("connect() error mapping", () => {
    it("maps a canceled-method error to CONNECT_MODAL_CLOSED", async () => {
      const client = makeClient(
        vi
          .fn()
          .mockRejectedValue(
            new Arc0027RequestError(ARC0027_ERROR_CODES.MethodCanceledError, "closed")
          )
      );
      const transport = new ExtensionTransport(client);

      await expect(transport.connect()).rejects.toMatchObject({
        data: {type: "CONNECT_MODAL_CLOSED"}
      });
    });

    it("maps an unauthorized-signer error to SESSION_RECONNECT", async () => {
      const client = makeClient(
        vi
          .fn()
          .mockRejectedValue(
            new Arc0027RequestError(ARC0027_ERROR_CODES.UnauthorizedSignerError, "stale")
          )
      );
      const transport = new ExtensionTransport(client);

      await expect(transport.connect()).rejects.toMatchObject({
        data: {type: "SESSION_RECONNECT"}
      });
    });

    it("maps an unrecognized error to a generic SIGN_TRANSACTIONS fallback", async () => {
      const client = makeClient(vi.fn().mockRejectedValue(new Error("boom")));
      const transport = new ExtensionTransport(client);

      await expect(transport.connect()).rejects.toMatchObject({
        data: {type: "SIGN_TRANSACTIONS"},
        message: "boom"
      });
    });
  });

  describe("signTransaction() error mapping", () => {
    it("maps a canceled-method error to SIGN_TXN_CANCELLED (sign context, not connect)", async () => {
      const client = makeClient(
        vi
          .fn()
          .mockRejectedValue(
            new Arc0027RequestError(ARC0027_ERROR_CODES.MethodCanceledError, "closed")
          )
      );
      const transport = new ExtensionTransport(client);

      await expect(transport.signTransaction([{txn: "AA=="}])).rejects.toMatchObject({
        data: {type: "SIGN_TXN_CANCELLED"}
      });
    });
  });

  describe("reconnect()", () => {
    it("returns [] without clearing storage when the extension is still discoverable", async () => {
      saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet-extension");
      const discover = vi
        .fn()
        .mockResolvedValue({providerId: "pera", name: "Pera", networks: []});
      const transport = new ExtensionTransport(makeClient(vi.fn(), discover));

      await expect(transport.reconnect()).resolves.toEqual([]);
      expect(discover).toHaveBeenCalled();
      expect(getWalletDetailsFromStorage()).not.toBeNull();
    });

    it("clears storage and returns [] when the extension is no longer discoverable", async () => {
      saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet-extension");
      const discover = vi.fn().mockResolvedValue(null);
      const transport = new ExtensionTransport(makeClient(vi.fn(), discover));

      await expect(transport.reconnect()).resolves.toEqual([]);
      expect(getWalletDetailsFromStorage()).toBeNull();
    });
  });

  describe("disconnect()", () => {
    it("requests disable and clears storage on success", async () => {
      saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet-extension");
      const request = vi.fn().mockResolvedValue({});
      const transport = new ExtensionTransport(makeClient(request));

      await transport.disconnect();

      expect(request).toHaveBeenCalledWith("disable", expect.any(Object));
      expect(getWalletDetailsFromStorage()).toBeNull();
    });

    it("still clears storage when the disable request fails (best-effort)", async () => {
      saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet-extension");
      const request = vi.fn().mockRejectedValue(new Error("extension gone"));
      const transport = new ExtensionTransport(makeClient(request));

      await expect(transport.disconnect()).resolves.toBeUndefined();
      expect(getWalletDetailsFromStorage()).toBeNull();
    });
  });

  describe("static discover()", () => {
    it("delegates to the client's discover()", async () => {
      const result = {providerId: "pera", name: "Pera", networks: []};
      const client = makeClient(vi.fn(), vi.fn().mockResolvedValue(result));

      await expect(ExtensionTransport.discover(client)).resolves.toEqual(result);
      expect(client.discover).toHaveBeenCalled();
    });
  });
});
