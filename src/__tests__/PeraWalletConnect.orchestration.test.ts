import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";

import PeraWalletConnect from "../PeraWalletConnect";
import {ScopeType, SignMetadata} from "../util/model/peraWalletModels";
import {
  saveWalletDetailsToStorage,
  resetWalletDetailsFromStorage
} from "../util/storage/storageUtils";
import {installPeraProvider, uninstallPeraProvider} from "./helpers/peraProviderStub";

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
    uninstallPeraProvider();
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("routes signTransaction through window.pera when platform is extension", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");
    const provider = installPeraProvider();

    provider.signTransactions.mockResolvedValue([Buffer.from([1]).toString("base64")]);

    const pera = new PeraWalletConnect();
    const txn = new algosdk.Transaction({
      type: algosdk.TransactionType.pay,
      sender: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
      paymentParams: {
        receiver: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ",
        amount: 0
      },
      suggestedParams: {
        fee: 1000,
        minFee: 1000,
        firstValid: 1,
        lastValid: 1000,
        genesisID: "testnet-v1.0",
        genesisHash: new Uint8Array(32),
        flatFee: true
      }
    });

    const signed = await pera.signTransaction([[{txn}, {txn, signers: []}]]);

    const sent = provider.signTransactions.mock.calls[0][0];

    expect(sent).toHaveLength(2);
    expect(sent[0].txn).toBe(
      Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64")
    );
    expect(sent[1].signers).toEqual([]);
    expect(signed).toHaveLength(1);
    expect(Array.from(signed[0])).toEqual([1]);
  });

  it("routes signData through window.pera when platform is extension", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");
    const provider = installPeraProvider();

    provider.signData.mockResolvedValue([Buffer.from([2]).toString("base64")]);

    const pera = new PeraWalletConnect();
    const result = await pera.signData(
      [{data: new Uint8Array([5]), message: "m"}],
      "ADDR"
    );

    expect(provider.signData).toHaveBeenCalledWith({
      data: [{signer: "ADDR", data: Buffer.from([5]).toString("base64"), message: "m"}]
    });
    expect(Array.from(result[0])).toEqual([2]);
  });

  it("fails with EXTENSION_NOT_AVAILABLE when the stored platform is extension but window.pera is gone", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

    const pera = new PeraWalletConnect();

    await expect(pera.signTransaction([[]])).rejects.toMatchObject({
      data: {type: "EXTENSION_NOT_AVAILABLE"}
    });
  });

  it("isExtensionAvailable() reports whether window.pera is present", async () => {
    await expect(new PeraWalletConnect().isExtensionAvailable()).resolves.toBe(false);

    installPeraProvider();
    await expect(new PeraWalletConnect().isExtensionAvailable()).resolves.toBe(true);
  });

  it("ignores a window.pera with an unknown version", async () => {
    Object.defineProperty(window, "pera", {
      value: {version: "2"},
      configurable: true,
      writable: true
    });

    await expect(new PeraWalletConnect().isExtensionAvailable()).resolves.toBe(false);
  });

  it("does not gate extension support behind the experimental option", async () => {
    installPeraProvider();

    await expect(
      new PeraWalletConnect({experimental: false}).isExtensionAvailable()
    ).resolves.toBe(true);
  });

  describe("events", () => {
    it("fires disconnect when the extension revokes the site, and clears the session", () => {
      saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");
      const provider = installPeraProvider();
      const pera = new PeraWalletConnect();
      const onDisconnect = vi.fn();

      pera.on("disconnect", onDisconnect);
      provider.emit("disconnect");

      expect(onDisconnect).toHaveBeenCalledTimes(1);
      expect(pera.isConnected).toBe(false);
      expect(pera.platform).toBeNull();
    });

    it("fires networkChanged with the wallet's new network", () => {
      const provider = installPeraProvider();
      const pera = new PeraWalletConnect();
      const onNetworkChanged = vi.fn();

      pera.on("networkChanged", onNetworkChanged);
      provider.emit("networkChanged", {network: "mainnet"});

      expect(onNetworkChanged).toHaveBeenCalledWith({network: "mainnet"});
    });

    it("on() returns an unsubscribe function", () => {
      saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");
      const provider = installPeraProvider();
      const pera = new PeraWalletConnect();
      const onDisconnect = vi.fn();

      const unsubscribe = pera.on("disconnect", onDisconnect);

      unsubscribe();
      provider.emit("disconnect");

      expect(onDisconnect).not.toHaveBeenCalled();
    });
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

    it("rejects a mismatched domain on the extension path before reaching the provider", async () => {
      saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");
      const provider = installPeraProvider();

      const pera = new PeraWalletConnect();

      await expect(
        pera.signArc60Data(makeArc60Payload("https://evil.example"), AUTH_METADATA)
      ).rejects.toMatchObject({data: {type: "SIGN_DATA_DOMAIN_MISMATCH"}});
      expect(provider.signData).not.toHaveBeenCalled();
    });

    it("sends the ARC-60 wire object to window.pera.signData when the domain matches", async () => {
      saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");
      const provider = installPeraProvider();

      provider.signData.mockResolvedValue([Buffer.from([9]).toString("base64")]);

      const pera = new PeraWalletConnect();
      const payload = makeArc60Payload(window.location.origin);

      await expect(pera.signArc60Data(payload, AUTH_METADATA)).resolves.toEqual({
        ...payload,
        signature: new Uint8Array([9])
      });

      const wire = provider.signData.mock.calls[0][0];

      expect(wire.domain).toBe(window.location.origin);
      expect(wire.metadata).toEqual(AUTH_METADATA);
      expect(typeof wire.authenticatorData).toBe("string");
    });
  });
});
