import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";

import {ExtensionTransport} from "../ExtensionTransport";
import {ScopeType} from "../../../util/model/peraWalletModels";
import {resetWalletDetailsFromStorage} from "../../../util/storage/storageUtils";

// A generated account gives us a real address for signer fields.
const account = algosdk.generateAccount();

function makeClient(request: any) {
  return {request, discover: vi.fn()} as any;
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

    await transport.signArc60Data(
      {
        data: new Uint8Array([1, 2]),
        signer: account.addr,
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
    expect(params.signer).toBe(account.addr);
    expect(params.metadata).toEqual({scope: ScopeType.AUTH, encoding: "base64"});
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
});
