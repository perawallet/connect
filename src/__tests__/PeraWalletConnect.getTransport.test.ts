import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";

import PeraWalletConnect from "../PeraWalletConnect";
import {ExtensionTransport} from "../transport/extension/ExtensionTransport";
import {WebTransport} from "../transport/WebTransport";
import {MobileTransport} from "../transport/MobileTransport";
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

const runWebSignTransactionFlowMock = vi.fn();

vi.mock("../util/sign/signTransactionFlow", () => ({
  runWebSignTransactionFlow: (args: any) => runWebSignTransactionFlowMock(args)
}));

describe("PeraWalletConnect.getTransport()", () => {
  afterEach(() => {
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("returns the shared extensionTransport instance when platform is extension", () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

    const pera = new PeraWalletConnect();
    const transport = (pera as any).getTransport();

    expect(transport).toBeInstanceOf(ExtensionTransport);
    expect(transport).toBe((pera as any).extensionTransport);
  });

  it("returns a WebTransport when platform is web", () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-web");

    const pera = new PeraWalletConnect();
    const transport = (pera as any).getTransport();

    expect(transport).toBeInstanceOf(WebTransport);
  });

  it("returns a MobileTransport bound to the live connector when platform is mobile", () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");

    const pera = new PeraWalletConnect();
    const fakeConnector = {sendCustomRequest: vi.fn(), accounts: ["ADDR"]};

    (pera as any).connector = fakeConnector;

    const transport = (pera as any).getTransport();

    expect(transport).toBeInstanceOf(MobileTransport);
  });

  it("throws when platform is mobile but no connector has been established", () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");

    const pera = new PeraWalletConnect();

    expect(() => (pera as any).getTransport()).toThrow(
      "PeraWalletConnect was not initialized correctly."
    );
  });

  function makeTxn() {
    const from = algosdk.generateAccount();
    const to = algosdk.generateAccount();

    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: from.addr,
      receiver: to.addr,
      amount: 1000,
      suggestedParams: {
        fee: 0,
        minFee: 1000,
        flatFee: false,
        firstValid: 1,
        lastValid: 1001,
        genesisID: "testnet-v1.0",
        genesisHash: new Uint8Array(32)
      }
    });
  }

  it("web: signTransaction reaches the web wallet URL resolved from config", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-web");
    runWebSignTransactionFlowMock.mockImplementation((args) =>
      args.resolve([new Uint8Array([1])])
    );

    const pera = new PeraWalletConnect();

    await expect(pera.signTransaction([[{txn: makeTxn()}]])).resolves.toEqual([
      new Uint8Array([1])
    ]);
    expect(runWebSignTransactionFlowMock).toHaveBeenCalledWith(
      expect.objectContaining({webWalletURL: "https://web.test"})
    );
  });

  it("mobile: signTransaction reaches the live connector with the config's silent flag", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");

    const pera = new PeraWalletConnect();
    const sendCustomRequest = vi
      .fn()
      .mockResolvedValue([Buffer.from([1]).toString("base64")]);

    (pera as any).connector = {sendCustomRequest, accounts: ["ADDR"]};

    await expect(pera.signTransaction([[{txn: makeTxn()}]])).resolves.toEqual([
      new Uint8Array([1])
    ]);
    expect(sendCustomRequest).toHaveBeenCalledWith(
      expect.any(Object),
      // config.silent is mocked to true above -> forcePushNotification is false
      {forcePushNotification: false}
    );
  });
});
