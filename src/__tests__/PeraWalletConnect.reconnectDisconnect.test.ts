import {describe, it, expect, vi, afterEach} from "vitest";

import PeraWalletConnect from "../PeraWalletConnect";
import {
  saveWalletDetailsToStorage,
  getWalletDetailsFromStorage,
  resetWalletDetailsFromStorage
} from "../util/storage/storageUtils";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../util/storage/storageConstants";

const {configState} = vi.hoisted(() => ({
  configState: {
    isWebWalletAvailable: false,
    bridgeURL: "https://bridge.test",
    webWalletURL: "https://web.test",
    shouldDisplayNewBadge: false,
    shouldUseSound: false,
    silent: true,
    promoteMobile: false
  }
}));

vi.mock("../util/api/peraWalletConnectApi", () => ({
  getPeraConnectConfig: () => Promise.resolve(configState)
}));

describe("PeraWalletConnect.reconnectSession()", () => {
  afterEach(() => {
    configState.isWebWalletAvailable = false;
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("resolves [] when nothing is stored", async () => {
    const pera = new PeraWalletConnect();

    await expect(pera.reconnectSession()).resolves.toEqual([]);
  });

  it("web: resolves stored accounts when the web wallet is available", async () => {
    configState.isWebWalletAvailable = true;
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-web");

    const pera = new PeraWalletConnect();

    await expect(pera.reconnectSession()).resolves.toEqual(["ADDR"]);
  });

  it("web: rejects with SESSION_RECONNECT when the web wallet is unavailable", async () => {
    configState.isWebWalletAvailable = false;
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-web");

    const pera = new PeraWalletConnect();

    await expect(pera.reconnectSession()).rejects.toMatchObject({
      data: {type: "SESSION_RECONNECT"}
    });
  });

  it("extension: treats a stored session as none when experimental support is off", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

    const pera = new PeraWalletConnect();
    const reconnectSpy = vi.spyOn((pera as any).extensionTransport, "reconnect");

    await expect(pera.reconnectSession()).resolves.toEqual([]);
    expect(reconnectSpy).not.toHaveBeenCalled();
    expect(getWalletDetailsFromStorage()).toBeNull();
  });

  it("extension: resolves accounts returned live by the transport", async () => {
    saveWalletDetailsToStorage(["STALE"], "pera-wallet-extension");

    const pera = new PeraWalletConnect({experimental: true});

    vi.spyOn((pera as any).extensionTransport, "reconnect").mockResolvedValue(["LIVE"]);

    await expect(pera.reconnectSession()).resolves.toEqual(["LIVE"]);
  });

  it("extension: falls back to stored accounts when the transport returns none", async () => {
    saveWalletDetailsToStorage(["STORED"], "pera-wallet-extension");

    const pera = new PeraWalletConnect({experimental: true});

    vi.spyOn((pera as any).extensionTransport, "reconnect").mockResolvedValue([]);

    await expect(pera.reconnectSession()).resolves.toEqual(["STORED"]);
  });

  it("mobile: resolves the live connector's accounts when one is already set", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");

    const pera = new PeraWalletConnect();

    (pera as any).connector = {accounts: ["LIVE_MOBILE"]};

    await expect(pera.reconnectSession()).resolves.toEqual(["LIVE_MOBILE"]);
  });

  it("mobile: resolves [] when there is no connector and no stored bridge", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");

    const pera = new PeraWalletConnect();

    await expect(pera.reconnectSession()).resolves.toEqual([]);
  });

  it("mobile: rebuilds the connector from a stored bridge and resolves its accounts", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");
    localStorage.setItem(
      PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT,
      JSON.stringify({bridge: "https://stored-bridge.test"})
    );

    const pera = new PeraWalletConnect();

    await expect(pera.reconnectSession()).resolves.toEqual([]);
    expect((pera as any).connector).not.toBeNull();
    expect((pera as any).bridge).toBe("https://stored-bridge.test");
  });

  it("rejects with SESSION_RECONNECT and disconnects when reading stored session state throws", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");
    // Malformed JSON makes getWalletConnectObjectFromStorage()'s JSON.parse
    // throw synchronously, which reconnectSession()'s catch-all must convert
    // into a SESSION_RECONNECT rejection after disconnecting.
    localStorage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT, "{not valid json");

    const pera = new PeraWalletConnect();

    await expect(pera.reconnectSession()).rejects.toMatchObject({
      data: {type: "SESSION_RECONNECT"}
    });
    expect(getWalletDetailsFromStorage()).toBeNull();
  });
});

describe("PeraWalletConnect.disconnect()", () => {
  afterEach(() => {
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("extension: disconnects the transport and clears storage", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

    const pera = new PeraWalletConnect();
    const disconnectSpy = vi
      .spyOn((pera as any).extensionTransport, "disconnect")
      .mockResolvedValue(undefined);

    await pera.disconnect();

    expect(disconnectSpy).toHaveBeenCalled();
    expect(getWalletDetailsFromStorage()).toBeNull();
  });

  it("mobile: kills the WalletConnect session, clears the connector, and clears storage", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");

    const pera = new PeraWalletConnect();
    const killSession = vi.fn().mockResolvedValue(undefined);

    (pera as any).connector = {killSession};

    await pera.disconnect();

    expect(killSession).toHaveBeenCalled();
    expect((pera as any).connector).toBeNull();
    expect(getWalletDetailsFromStorage()).toBeNull();
  });

  it("does nothing beyond clearing storage when nothing is connected", async () => {
    const pera = new PeraWalletConnect();
    const extensionDisconnectSpy = vi.spyOn(
      (pera as any).extensionTransport,
      "disconnect"
    );

    await expect(pera.disconnect()).resolves.toBeUndefined();
    expect(extensionDisconnectSpy).not.toHaveBeenCalled();
  });
});
