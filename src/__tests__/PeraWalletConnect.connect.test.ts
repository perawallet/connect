import {describe, it, expect, vi, afterEach} from "vitest";

import {
  getWalletDetailsFromStorage,
  resetWalletDetailsFromStorage
} from "../util/storage/storageUtils";

const {FakeConnector, createSessionBehavior} = vi.hoisted(() => {
  const innerCreateSessionBehavior = {impl: () => Promise.resolve(undefined as void)};

  class InnerFakeConnector {
    static instances: InnerFakeConnector[] = [];
    opts: any;
    connected = false;
    accounts: string[] = [];
    handlers: Record<string, (error: any, payload: any) => void> = {};
    killSession = vi.fn().mockResolvedValue(undefined);
    sendCustomRequest = vi.fn();

    constructor(opts: any) {
      this.opts = opts;
      InnerFakeConnector.instances.push(this);
    }

    on(event: string, cb: (error: any, payload: any) => void) {
      this.handlers[event] = cb;
    }

    createSession() {
      return innerCreateSessionBehavior.impl();
    }

    emitConnect(error: any, accounts: string[]) {
      this.connected = true;
      this.accounts = accounts;
      this.handlers.connect?.(error, {params: [{accounts}]});
    }
  }

  return {
    FakeConnector: InnerFakeConnector,
    createSessionBehavior: innerCreateSessionBehavior
  };
});

vi.mock("@perawallet/walletconnect", () => ({default: FakeConnector}));

const runWebConnectFlowMock = vi.fn((_args: any) => vi.fn());

vi.mock("../util/connect/connectFlow", () => ({
  runWebConnectFlow: (args: any) => runWebConnectFlowMock(args)
}));

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

const {default: PeraWalletConnect} = await import("../PeraWalletConnect");

// FakeConnector's createSession/`connect()`'s internal awaited config/webview
// promises all resolve on the microtask queue; a real macrotask tick flushes
// them so the connector instance exists before we drive it from the test.
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

// These two tests only assert on window.onWebWalletConnect wiring and never
// drive connect() to settle; swallow the otherwise-dangling rejection.
function ignoreRejection() {
  // no-op
}

describe("PeraWalletConnect.connect()", () => {
  afterEach(() => {
    FakeConnector.instances.length = 0;
    createSessionBehavior.impl = () => Promise.resolve(undefined);
    configState.isWebWalletAvailable = false;
    delete (window as any).onWebWalletConnect;
    delete (window as any).onExtensionConnect;
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("creates a session and resolves with accounts, persisting them to storage", async () => {
    const pera = new PeraWalletConnect();
    const connectPromise = pera.connect();

    await flush();
    expect(FakeConnector.instances).toHaveLength(1);

    FakeConnector.instances[0].emitConnect(null, ["ADDR1"]);

    await expect(connectPromise).resolves.toEqual(["ADDR1"]);
    expect(getWalletDetailsFromStorage()?.accounts).toEqual(["ADDR1"]);
  });

  it("kills an existing connected session before creating a new one", async () => {
    const pera = new PeraWalletConnect();
    const firstConnect = pera.connect();

    await flush();
    const first = FakeConnector.instances[0];

    first.emitConnect(null, ["ADDR1"]);
    await firstConnect;

    first.connected = true;

    const secondConnect = pera.connect();

    await flush();
    expect(first.killSession).toHaveBeenCalled();
    expect(FakeConnector.instances).toHaveLength(2);

    FakeConnector.instances[1].emitConnect(null, ["ADDR2"]);
    await expect(secondConnect).resolves.toEqual(["ADDR2"]);
  });

  it("rejects with a SESSION_CONNECT error when session creation fails", async () => {
    createSessionBehavior.impl = () => Promise.reject(new Error("bridge unreachable"));

    const pera = new PeraWalletConnect();

    await expect(pera.connect()).rejects.toMatchObject({
      data: {type: "SESSION_CONNECT"},
      message: "bridge unreachable"
    });
  });

  it("wires window.onWebWalletConnect when the web wallet is available", async () => {
    configState.isWebWalletAvailable = true;

    const pera = new PeraWalletConnect();

    pera.connect().catch(ignoreRejection);
    await flush();

    expect(runWebConnectFlowMock).toHaveBeenCalledWith(
      expect.objectContaining({webWalletURL: configState.webWalletURL})
    );
    expect(typeof (window as any).onWebWalletConnect).toBe("function");
  });

  it("does not expose window.onWebWalletConnect when the web wallet is unavailable", async () => {
    configState.isWebWalletAvailable = false;

    const pera = new PeraWalletConnect();

    pera.connect().catch(ignoreRejection);
    await flush();

    expect((window as any).onWebWalletConnect).toBeUndefined();
  });

  it("auto-connects via the extension when discovered and preferred", async () => {
    const pera = new PeraWalletConnect({experimental: true});

    vi.spyOn((pera as any).arc0027Client, "discover").mockResolvedValue({
      providerId: "pera",
      name: "Pera Extension",
      networks: []
    });
    const extensionConnectSpy = vi
      .spyOn((pera as any).extensionTransport, "connect")
      .mockResolvedValue(["EXT_ADDR"]);

    const connectPromise = pera.connect({selectedAccount: "EXT_ADDR"});

    await flush();
    expect(typeof (window as any).onExtensionConnect).toBe("function");

    (window as any).onExtensionConnect();

    await expect(connectPromise).resolves.toEqual(["EXT_ADDR"]);
    expect(extensionConnectSpy).toHaveBeenCalledWith({selectedAccount: "EXT_ADDR"});
  });

  it("does not probe for the extension when experimental support is off", async () => {
    const pera = new PeraWalletConnect();
    const discoverSpy = vi.spyOn((pera as any).arc0027Client, "discover");

    const connectPromise = pera.connect();

    await flush();
    expect(discoverSpy).not.toHaveBeenCalled();
    expect((window as any).onExtensionConnect).toBeUndefined();

    FakeConnector.instances[0].emitConnect(null, ["ADDR1"]);
    await connectPromise;
  });

  it("does not probe for the extension when shouldPreferExtension is false", async () => {
    const pera = new PeraWalletConnect({
      experimental: true,
      shouldPreferExtension: false
    });
    const discoverSpy = vi.spyOn((pera as any).arc0027Client, "discover");

    const connectPromise = pera.connect();

    await flush();
    expect(discoverSpy).not.toHaveBeenCalled();

    FakeConnector.instances[0].emitConnect(null, ["ADDR1"]);
    await connectPromise;
  });
});
