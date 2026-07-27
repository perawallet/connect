import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";
import {sign_detached} from "tweetnacl-ts";

import PeraWalletConnect from "../PeraWalletConnect";
import {ScopeType} from "../util/model/peraWalletModels";
import {
  saveWalletDetailsToStorage,
  resetWalletDetailsFromStorage
} from "../util/storage/storageUtils";

vi.mock("../util/api/peraWalletConnectApi", () => ({
  getPeraConnectConfig: () =>
    Promise.resolve({
      isWebWalletAvailable: false,
      bridgeURL: "https://bridge.test",
      webWalletURL: "https://web.test",
      shouldDisplayNewBadge: false,
      shouldUseSound: false,
      silent: true,
      promoteMobile: false
    })
}));

const account = algosdk.generateAccount();

describe("PeraWalletConnect.signData", () => {
  afterEach(() => {
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("skips verification by default", async () => {
    saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet");

    const pera = new PeraWalletConnect();
    const signature = new Uint8Array([1, 2, 3]);

    vi.spyOn(pera as any, "getTransport").mockReturnValue({
      signData: vi.fn().mockResolvedValue([signature])
    });
    const authAddrSpy = vi.spyOn(pera as any, "getAccountAuthAddr");

    const result = await pera.signData(
      [{data: new Uint8Array([9]), message: "m"}],
      account.addr.toString()
    );

    expect(result).toEqual([signature]);
    expect(authAddrSpy).not.toHaveBeenCalled();
  });

  it("resolves when verifySignature is true and the signature checks out", async () => {
    saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet");

    const pera = new PeraWalletConnect();
    const data = new Uint8Array([9, 9]);

    vi.spyOn(pera as any, "getAccountAuthAddr").mockResolvedValue(null);
    vi.spyOn(pera, "verifySignature").mockReturnValue(true);
    vi.spyOn(pera as any, "getTransport").mockReturnValue({
      signData: vi.fn().mockResolvedValue([new Uint8Array([1])])
    });

    await expect(
      pera.signData([{data, message: "m"}], account.addr.toString(), true)
    ).resolves.toEqual([new Uint8Array([1])]);
  });

  it("throws SIGN_DATA_VERIFICATION_FAILED when the signature does not check out", async () => {
    saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet");

    const pera = new PeraWalletConnect();

    vi.spyOn(pera as any, "getAccountAuthAddr").mockResolvedValue(null);
    vi.spyOn(pera, "verifySignature").mockReturnValue(false);
    vi.spyOn(pera as any, "getTransport").mockReturnValue({
      signData: vi.fn().mockResolvedValue([new Uint8Array([1])])
    });

    await expect(
      pera.signData(
        [{data: new Uint8Array([9]), message: "m"}],
        account.addr.toString(),
        true
      )
    ).rejects.toMatchObject({data: {type: "SIGN_DATA_VERIFICATION_FAILED"}});
  });

  it("falls back to the on-chain auth address as the effective signer when verifying", async () => {
    saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet");

    const pera = new PeraWalletConnect();
    const authAddr = algosdk.generateAccount().addr.toString();

    vi.spyOn(pera as any, "getAccountAuthAddr").mockResolvedValue(authAddr);
    const verifySpy = vi.spyOn(pera, "verifySignature").mockReturnValue(true);

    vi.spyOn(pera as any, "getTransport").mockReturnValue({
      signData: vi.fn().mockResolvedValue([new Uint8Array([1])])
    });

    await pera.signData(
      [{data: new Uint8Array([9]), message: "m"}],
      account.addr.toString(),
      true
    );

    expect(verifySpy).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.any(Uint8Array),
      authAddr
    );
  });
});

describe("PeraWalletConnect.signArc60Data", () => {
  afterEach(() => {
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  function makePayload() {
    return {
      data: Buffer.from(new Uint8Array([1, 2])).toString("base64"),
      signer: algosdk.decodeAddress(account.addr.toString()).publicKey,
      domain: window.location.origin,
      authenticatorData: new Uint8Array(37)
    };
  }

  it("throws when connected to neither mobile nor the extension", async () => {
    const pera = new PeraWalletConnect();

    await expect(
      pera.signArc60Data(makePayload(), {scope: ScopeType.AUTH, encoding: "base64"})
    ).rejects.toThrow(
      "ARC-60 signing is only supported via the Pera mobile wallet or the Pera extension."
    );
  });

  it("resolves with the transport's response when verification is skipped", async () => {
    saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet");

    const pera = new PeraWalletConnect();
    const signature = new Uint8Array([9, 9]);

    vi.spyOn(pera as any, "getTransport").mockReturnValue({
      signArc60Data: vi.fn().mockResolvedValue({signature})
    });

    const response = await pera.signArc60Data(makePayload(), {
      scope: ScopeType.AUTH,
      encoding: "base64"
    });

    expect(response.signature).toBe(signature);
    expect(response.signer).toEqual(
      algosdk.decodeAddress(account.addr.toString()).publicKey
    );
  });

  it("resolves when verifySignature is true and the ARC-60 signature checks out", async () => {
    saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet");

    const pera = new PeraWalletConnect();
    const signature = new Uint8Array([9, 9]);

    vi.spyOn(pera as any, "getTransport").mockReturnValue({
      signArc60Data: vi.fn().mockResolvedValue({signature})
    });
    vi.spyOn(pera, "verifyArc60Signature").mockResolvedValue(true);

    await expect(
      pera.signArc60Data(makePayload(), {scope: ScopeType.AUTH, encoding: "base64"}, true)
    ).resolves.toMatchObject({signature});
  });

  it("throws SIGN_DATA_VERIFICATION_FAILED when the ARC-60 signature does not check out", async () => {
    saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet-extension");

    const pera = new PeraWalletConnect();

    vi.spyOn(pera as any, "getTransport").mockReturnValue({
      signArc60Data: vi.fn().mockResolvedValue({signature: new Uint8Array([9])})
    });
    vi.spyOn(pera, "verifyArc60Signature").mockResolvedValue(false);

    await expect(
      pera.signArc60Data(makePayload(), {scope: ScopeType.AUTH, encoding: "base64"}, true)
    ).rejects.toMatchObject({data: {type: "SIGN_DATA_VERIFICATION_FAILED"}});
  });

  it("passes requestId and hdPath through when present, and omits them otherwise", async () => {
    saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet");

    const pera = new PeraWalletConnect();

    vi.spyOn(pera as any, "getTransport").mockReturnValue({
      signArc60Data: vi.fn().mockResolvedValue({signature: new Uint8Array([1])})
    });

    const withoutOptional = await pera.signArc60Data(makePayload(), {
      scope: ScopeType.AUTH,
      encoding: "base64"
    });

    expect(withoutOptional).not.toHaveProperty("requestId");
    expect(withoutOptional).not.toHaveProperty("hdPath");

    const withOptional = await pera.signArc60Data(
      {...makePayload(), requestId: "req-1", hdPath: "m/44'/283'/0'/0/0"},
      {scope: ScopeType.AUTH, encoding: "base64"}
    );

    expect(withOptional.requestId).toBe("req-1");
    expect(withOptional.hdPath).toBe("m/44'/283'/0'/0/0");
  });

  // Verification must decode `data` the same way the wire encoder does, using
  // real crypto rather than a mocked verifier — mocking it is what let the
  // encoding mismatch ship in the 1.6.0 betas.
  describe.each(["base64", "hex", "utf8"])(
    "verifies a genuine signature when encoding is %s",
    (encoding) => {
      it("accepts the wallet's signature over the decoded bytes", async () => {
        saveWalletDetailsToStorage([account.addr.toString()], "pera-wallet");

        const authenticatorData = new Uint8Array(37).fill(3);
        const rawData = Buffer.from(`{"domain":"${window.location.origin}"}`, "utf8");
        const payload = {
          data: rawData.toString(encoding as BufferEncoding),
          signer: algosdk.decodeAddress(account.addr.toString()).publicKey,
          domain: window.location.origin,
          authenticatorData
        };

        // Sign exactly what ARC-60 says the wallet signs.
        const digest = async (bytes: Uint8Array) =>
          new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
        const toBeSigned = new Uint8Array([
          ...(await digest(new Uint8Array(rawData))),
          ...(await digest(authenticatorData))
        ]);
        const signature = sign_detached(toBeSigned, account.sk);

        const pera = new PeraWalletConnect();

        vi.spyOn(pera as any, "getTransport").mockReturnValue({
          signArc60Data: vi.fn().mockResolvedValue({signature})
        });

        await expect(
          pera.signArc60Data(payload, {scope: ScopeType.AUTH, encoding}, true)
        ).resolves.toMatchObject({signature});
      });
    }
  );
});
