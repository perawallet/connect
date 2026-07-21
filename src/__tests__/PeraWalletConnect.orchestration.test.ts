import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";

import PeraWalletConnect from "../PeraWalletConnect";
import {ScopeType, SignMetadata} from "../util/model/peraWalletModels";
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

describe("PeraWalletConnect orchestration", () => {
  afterEach(() => {
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("routes signTransaction to the extension transport when platform is extension", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

    const pera = new PeraWalletConnect();
    const spy = vi
      .spyOn((pera as any).extensionTransport, "signTransaction")
      .mockResolvedValue([new Uint8Array([1])]);

    await pera.signTransaction([[]]);

    expect(spy).toHaveBeenCalled();
  });

  it("isExtensionAvailable resolves false when nothing answers discover", async () => {
    const pera = new PeraWalletConnect({experimental: true});

    await expect(pera.isExtensionAvailable()).resolves.toBe(false);
  });

  it("does not probe for the extension when experimental support is off", async () => {
    const pera = new PeraWalletConnect();
    const discoverSpy = vi.spyOn((pera as any).arc0027Client, "discover");

    await expect(pera.isExtensionAvailable()).resolves.toBe(false);
    expect(discoverSpy).not.toHaveBeenCalled();
  });

  it("probes discover when experimental extension support is on", async () => {
    const pera = new PeraWalletConnect({experimental: true});
    const discoverSpy = vi
      .spyOn((pera as any).arc0027Client, "discover")
      .mockResolvedValue({providerId: "pera", name: "Pera", networks: []});

    await expect(pera.isExtensionAvailable()).resolves.toBe(true);
    expect(discoverSpy).toHaveBeenCalled();
  });

  describe("signArc60Data origin binding", () => {
    const AUTH_METADATA: SignMetadata = {scope: ScopeType.AUTH, encoding: "base64"};

    function makeArc60Payload(domain: string) {
      return {
        data: Buffer.from(new Uint8Array([1, 2])).toString("base64"),
        signer: algosdk.decodeAddress(
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ"
        ).publicKey,
        domain,
        authenticatorData: new Uint8Array(37)
      };
    }

    it("rejects a mismatched domain on the mobile path before contacting the wallet", async () => {
      saveWalletDetailsToStorage(["ADDR"], "pera-wallet");

      const pera = new PeraWalletConnect();

      await expect(
        pera.signArc60Data(makeArc60Payload("https://evil.example"), AUTH_METADATA)
      ).rejects.toMatchObject({data: {type: "SIGN_DATA_DOMAIN_MISMATCH"}});
    });

    it("rejects a mismatched domain on the extension path before reaching the transport", async () => {
      saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

      const pera = new PeraWalletConnect();
      const spy = vi.spyOn((pera as any).extensionTransport, "signArc60Data");

      await expect(
        pera.signArc60Data(makeArc60Payload("https://evil.example"), AUTH_METADATA)
      ).rejects.toMatchObject({data: {type: "SIGN_DATA_DOMAIN_MISMATCH"}});
      expect(spy).not.toHaveBeenCalled();
    });

    it("forwards the payload and metadata separately to the transport when the domain matches", async () => {
      saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

      const pera = new PeraWalletConnect();
      const payload = makeArc60Payload(window.location.origin);
      const response = {signature: new Uint8Array([9])};
      const spy = vi
        .spyOn((pera as any).extensionTransport, "signArc60Data")
        .mockResolvedValue(response);

      await expect(pera.signArc60Data(payload, AUTH_METADATA)).resolves.toEqual({
        ...payload,
        signature: response.signature
      });
      expect(spy).toHaveBeenCalledWith(payload, AUTH_METADATA);
    });
  });

  it("treats a stored extension session as no session when experimental support is off", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

    const pera = new PeraWalletConnect();
    const reconnectSpy = vi.spyOn((pera as any).extensionTransport, "reconnect");

    await expect(pera.reconnectSession()).resolves.toEqual([]);
    expect(reconnectSpy).not.toHaveBeenCalled();
    expect(pera.platform).toBeNull();
  });
});
