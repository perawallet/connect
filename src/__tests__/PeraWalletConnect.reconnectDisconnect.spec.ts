import {describe, it, expect, vi, afterEach} from "vitest";

import PeraWalletConnect from "../PeraWalletConnect";
import {
  saveWalletDetailsToStorage,
  getWalletDetailsFromStorage,
  resetWalletDetailsFromStorage
} from "../util/storage/storageUtils";
import {
  PERA_WALLET_LOCAL_STORAGE_KEYS,
  LEGACY_WALLETCONNECT_STORAGE_KEY
} from "../util/storage/storageConstants";
import {PERA_PROVIDER_ERROR_CODES} from "../transport/extension/peraProviderTypes";
import {
  installPeraProvider,
  makePeraProviderError,
  uninstallPeraProvider
} from "./helpers/peraProviderStub";

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
    uninstallPeraProvider();
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

  it("extension: treats a stored session as none when window.pera is gone", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

    const pera = new PeraWalletConnect();

    await expect(pera.reconnectSession()).resolves.toEqual([]);
    expect(getWalletDetailsFromStorage()).toBeNull();
  });

  it("extension: silently reconnects with the wallet's current accounts", async () => {
    saveWalletDetailsToStorage(["STALE"], "pera-wallet-extension");
    const provider = installPeraProvider(["LIVE"]);

    const pera = new PeraWalletConnect();

    await expect(pera.reconnectSession()).resolves.toEqual(["LIVE"]);
    expect(provider.connect).toHaveBeenCalledTimes(1);
    expect(getWalletDetailsFromStorage()?.accounts).toEqual(["LIVE"]);
  });

  it("extension: resolves [] and clears storage when the origin is no longer approved", async () => {
    saveWalletDetailsToStorage(["STALE"], "pera-wallet-extension");
    const provider = installPeraProvider();

    provider.connect.mockRejectedValue(
      makePeraProviderError(PERA_PROVIDER_ERROR_CODES.UNAUTHORIZED)
    );

    const pera = new PeraWalletConnect();

    await expect(pera.reconnectSession()).resolves.toEqual([]);
    expect(getWalletDetailsFromStorage()).toBeNull();
    expect(pera.isConnected).toBe(false);
  });

  it("extension: rejects with SESSION_RECONNECT on any other provider failure, keeping the approval", async () => {
    saveWalletDetailsToStorage(["STALE"], "pera-wallet-extension");
    const provider = installPeraProvider();

    provider.connect.mockRejectedValue(
      makePeraProviderError(PERA_PROVIDER_ERROR_CODES.INTERNAL_ERROR)
    );

    const pera = new PeraWalletConnect();

    await expect(pera.reconnectSession()).rejects.toMatchObject({
      data: {type: "SESSION_RECONNECT"}
    });
    // A transient provider failure (the service worker restarting mid
    // page-load) must not revoke the origin in the wallet or drop the session.
    expect(provider.disconnect).not.toHaveBeenCalled();
    expect(getWalletDetailsFromStorage()?.accounts).toEqual(["STALE"]);
  });

  it("extension: surfaces a network mismatch without revoking the origin", async () => {
    saveWalletDetailsToStorage(["STALE"], "pera-wallet-extension");
    const provider = installPeraProvider();

    provider.connect.mockRejectedValue(
      makePeraProviderError(PERA_PROVIDER_ERROR_CODES.NETWORK_NOT_SUPPORTED)
    );

    const pera = new PeraWalletConnect();

    // The cause stays at `data.type` instead of being buried under a second
    // SESSION_RECONNECT wrapper, and the session survives until the user
    // switches the wallet back.
    await expect(pera.reconnectSession()).rejects.toMatchObject({
      data: {type: "CONNECT_NETWORK_MISMATCH"}
    });
    expect(provider.disconnect).not.toHaveBeenCalled();
    expect(getWalletDetailsFromStorage()?.accounts).toEqual(["STALE"]);
  });

  it("extension: does not touch window.pera for a mobile session", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");
    const provider = installPeraProvider();

    const pera = new PeraWalletConnect();

    await pera.reconnectSession();

    expect(provider.connect).not.toHaveBeenCalled();
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
    uninstallPeraProvider();
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("extension: disconnects through window.pera and clears storage", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");
    const provider = installPeraProvider();

    const pera = new PeraWalletConnect();

    await pera.disconnect();

    expect(provider.disconnect).toHaveBeenCalled();
    expect(getWalletDetailsFromStorage()).toBeNull();
  });

  it("extension: clears storage even when window.pera is gone", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

    const pera = new PeraWalletConnect();

    await expect(pera.disconnect()).resolves.toBeUndefined();
    expect(getWalletDetailsFromStorage()).toBeNull();
  });

  it("mobile: kills the WalletConnect session, clears the connector, and clears storage", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");

    const pera = new PeraWalletConnect();
    const killSession = vi.fn().mockResolvedValue(undefined);

    (pera as any).connector = {connected: true, killSession};

    await pera.disconnect();

    expect(killSession).toHaveBeenCalled();
    expect((pera as any).connector).toBeNull();
    expect(getWalletDetailsFromStorage()).toBeNull();
  });

  it("does nothing beyond clearing storage when nothing is connected", async () => {
    const provider = installPeraProvider();
    const pera = new PeraWalletConnect();

    await expect(pera.disconnect()).resolves.toBeUndefined();
    expect(provider.disconnect).not.toHaveBeenCalled();
  });
});

describe("PeraWalletConnect legacy walletconnect session migration", () => {
  // A session as persisted by the WalletConnect v1 fork. `key: ""` and
  // `handshakeId: 0` keep the real connector off the crypto/subscription paths.
  const legacySession = {
    connected: true,
    accounts: ["ADDR"],
    chainId: 4160,
    bridge: "https://stored-bridge.test",
    key: "",
    clientId: "client-id",
    clientMeta: null,
    peerId: "peer-id",
    peerMeta: null,
    handshakeId: 0,
    handshakeTopic: ""
  };

  // resetWalletDetailsFromStorage() deliberately no longer touches the shared
  // "walletconnect" key, so this suite must clear storage itself.
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("moves a Pera-owned session to the namespaced key on init and reconnects from it", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");
    const raw = JSON.stringify(legacySession);

    localStorage.setItem(LEGACY_WALLETCONNECT_STORAGE_KEY, raw);

    const pera = new PeraWalletConnect();

    expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBe(raw);
    expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBeNull();

    // The legacy key is already gone, so resolving the accounts proves the
    // connector restored its session from the namespaced key.
    await expect(pera.reconnectSession()).resolves.toEqual(["ADDR"]);
    expect(pera.bridge).toBe("https://stored-bridge.test");
  });

  it("leaves a foreign session under the shared key untouched through init and disconnect", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");
    const raw = JSON.stringify({...legacySession, accounts: ["OTHER"]});

    localStorage.setItem(LEGACY_WALLETCONNECT_STORAGE_KEY, raw);

    const pera = new PeraWalletConnect();

    await pera.disconnect();

    expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBe(raw);
    expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBeNull();
    expect(getWalletDetailsFromStorage()).toBeNull();
  });
});
