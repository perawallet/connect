import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";

import PeraWalletConnect from "../PeraWalletConnect";
import {
  resetWalletDetailsFromStorage,
  saveWalletDetailsToStorage
} from "../util/storage/storageUtils";
import {PERA_PROVIDER_ERROR_CODES} from "../transport/extension/peraProviderTypes";
import {
  installPeraProvider,
  makePeraProviderError,
  uninstallPeraProvider
} from "./helpers/peraProviderStub";

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

const ACCOUNT = algosdk.generateAccount().addr.toString();
const TESTNET = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe";

function makeConnector(overrides: Partial<any> = {}) {
  const handlers: Record<string, () => void> = {};

  return {
    connected: true,
    peerId: "peer-1",
    accounts: [ACCOUNT],
    sendCustomRequest: vi.fn().mockResolvedValue({[ACCOUNT]: "gA=="}),
    on: (event: string, handler: () => void) => {
      handlers[event] = handler;
    },
    fire: (event: string) => handlers[event]?.(),
    ...overrides
  };
}

function mobileWallet(connector: any, chainId?: 416001 | 416002 | 416003 | 4160) {
  saveWalletDetailsToStorage([ACCOUNT], "pera-wallet");

  const pera = new PeraWalletConnect(chainId ? {chainId} : undefined);

  (pera as any).connector = connector;

  return pera;
}

function deferred() {
  let resolve: (value: unknown) => void = () => undefined;
  const promise = new Promise((innerResolve) => {
    resolve = innerResolve;
  });

  return {promise, resolve};
}

describe("PeraWalletConnect.getEmptySignatures()", () => {
  afterEach(() => {
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("asks the wallet for the given network and returns its answer", async () => {
    const connector = makeConnector();
    const pera = mobileWallet(connector);

    await expect(pera.getEmptySignatures("testnet")).resolves.toEqual({
      [ACCOUNT]: "gA=="
    });
    expect(connector.sendCustomRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "algo_getEmptySignatures",
        params: {chainId: TESTNET}
      }),
      {forcePushNotification: false}
    );
  });

  it("falls back to the network the chainId option pins", async () => {
    const connector = makeConnector();
    const pera = mobileWallet(connector, 416003);

    await pera.getEmptySignatures();

    expect(connector.sendCustomRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {chainId: "algorand:mFgazF-2uRS1tMiL9dsj01hJGySEmPN2"}
      }),
      expect.anything()
    );
  });

  it("requires a network on an all-networks session", async () => {
    const pera = mobileWallet(makeConnector(), 4160);

    await expect(pera.getEmptySignatures()).rejects.toMatchObject({
      data: {type: "EMPTY_SIGNATURES_NETWORK_REQUIRED"}
    });
  });

  it("filters the answer to the session's accounts", async () => {
    const stranger = algosdk.generateAccount().addr.toString();
    const connector = makeConnector({
      sendCustomRequest: vi
        .fn()
        .mockResolvedValue({[ACCOUNT]: "gA==", [stranger]: "gA=="})
    });

    await expect(mobileWallet(connector).getEmptySignatures("testnet")).resolves.toEqual({
      [ACCOUNT]: "gA=="
    });
  });

  it("resolves {} without contacting anything on Pera Web", async () => {
    saveWalletDetailsToStorage([ACCOUNT], "pera-wallet-web");

    const pera = new PeraWalletConnect();
    const connector = makeConnector();

    (pera as any).connector = connector;

    await expect(pera.getEmptySignatures("testnet")).resolves.toEqual({});
    expect(connector.sendCustomRequest).not.toHaveBeenCalled();
  });

  describe("on the Pera extension", () => {
    afterEach(() => {
      uninstallPeraProvider();
    });

    function extensionWallet(
      getEmptySignatures?: ReturnType<typeof vi.fn>,
      chainId?: 416001 | 416002 | 416003 | 4160
    ) {
      const provider = installPeraProvider([ACCOUNT]);

      if (getEmptySignatures) {
        Object.assign(provider, {getEmptySignatures});
      }

      saveWalletDetailsToStorage([ACCOUNT], "pera-wallet-extension");

      return new PeraWalletConnect(chainId ? {chainId} : undefined);
    }

    it("resolves {} from an extension that predates getEmptySignatures", async () => {
      await expect(extensionWallet().getEmptySignatures("testnet")).resolves.toEqual({});
    });

    it("asks window.pera and filters the answer to the connected accounts", async () => {
      const stranger = algosdk.generateAccount().addr.toString();
      const getEmptySignatures = vi
        .fn()
        .mockResolvedValue({[ACCOUNT]: "gA==", [stranger]: "gA=="});

      await expect(
        extensionWallet(getEmptySignatures).getEmptySignatures("testnet")
      ).resolves.toEqual({[ACCOUNT]: "gA=="});
      expect(getEmptySignatures).toHaveBeenCalledWith({network: "testnet"});
    });

    it("lets the wallet pick its network on an all-networks session", async () => {
      const getEmptySignatures = vi.fn().mockResolvedValue({[ACCOUNT]: "gA=="});

      await expect(
        extensionWallet(getEmptySignatures, 4160).getEmptySignatures()
      ).resolves.toEqual({[ACCOUNT]: "gA=="});
      expect(getEmptySignatures).toHaveBeenCalledWith(undefined);
    });

    it("sends the network the chainId option pins", async () => {
      const getEmptySignatures = vi.fn().mockResolvedValue({});

      await extensionWallet(getEmptySignatures, 416002).getEmptySignatures();

      expect(getEmptySignatures).toHaveBeenCalledWith({network: "testnet"});
    });

    it("rejects with EMPTY_SIGNATURES_NETWORK_MISMATCH when the wallet is elsewhere", async () => {
      const getEmptySignatures = vi
        .fn()
        .mockRejectedValue(
          makePeraProviderError(
            PERA_PROVIDER_ERROR_CODES.NETWORK_NOT_SUPPORTED,
            "The wallet is on mainnet, not testnet"
          )
        );

      await expect(
        extensionWallet(getEmptySignatures).getEmptySignatures("testnet")
      ).rejects.toMatchObject({data: {type: "EMPTY_SIGNATURES_NETWORK_MISMATCH"}});
    });

    it("rejects with EXTENSION_NOT_AVAILABLE when window.pera is gone", async () => {
      saveWalletDetailsToStorage([ACCOUNT], "pera-wallet-extension");

      await expect(
        new PeraWalletConnect().getEmptySignatures("testnet")
      ).rejects.toMatchObject({data: {type: "EXTENSION_NOT_AVAILABLE"}});
    });
  });

  it("rejects an unsupported network before anything else, even on the extension", async () => {
    saveWalletDetailsToStorage([ACCOUNT], "pera-wallet-extension");

    await expect(
      new PeraWalletConnect().getEmptySignatures("localnet" as any)
    ).rejects.toMatchObject({
      data: {type: "EMPTY_SIGNATURES_NETWORK_UNSUPPORTED", detail: "localnet"}
    });
  });

  it("rejects with SESSION_DISCONNECTED when nothing is connected", async () => {
    await expect(
      new PeraWalletConnect().getEmptySignatures("testnet")
    ).rejects.toMatchObject({
      data: {type: "SESSION_DISCONNECTED"}
    });

    const pera = mobileWallet(makeConnector({connected: false}));

    await expect(pera.getEmptySignatures("testnet")).rejects.toMatchObject({
      data: {type: "SESSION_DISCONNECTED"}
    });
  });

  it("still resolves when reconnectSession() replaces the connector for the same session", async () => {
    const answer = deferred();
    const first = makeConnector({sendCustomRequest: vi.fn(() => answer.promise)});
    const pera = mobileWallet(first);
    const pending = pera.getEmptySignatures("testnet");

    (pera as any).connector = makeConnector({peerId: "peer-1"});
    answer.resolve({[ACCOUNT]: "gA=="});

    await expect(pending).resolves.toEqual({[ACCOUNT]: "gA=="});
  });

  it("rejects when the wallet ends the session mid-request", async () => {
    const answer = deferred();
    const connector = makeConnector({sendCustomRequest: vi.fn(() => answer.promise)});
    const pera = mobileWallet(connector);

    (pera as any).forwardConnectorDisconnect(connector);

    const pending = pera.getEmptySignatures("testnet");

    connector.fire("disconnect");
    answer.resolve({[ACCOUNT]: "gA=="});

    await expect(pending).rejects.toMatchObject({
      data: {type: "EMPTY_SIGNATURES", detail: {reason: "session-changed"}}
    });
  });
});
