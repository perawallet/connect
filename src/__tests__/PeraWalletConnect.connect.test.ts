import {describe, it, expect, vi, afterEach} from "vitest";

import {
  getWalletDetailsFromStorage,
  resetWalletDetailsFromStorage,
  saveWalletDetailsToStorage
} from "../util/storage/storageUtils";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../util/storage/storageConstants";
import {PERA_WALLET_EXTENSION_CONNECT_EVENT} from "../modal/peraWalletConnectModalUtils";
import {PERA_PROVIDER_ERROR_CODES} from "../transport/extension/peraProviderTypes";
import {
  installPeraProvider,
  makePeraProviderError,
  uninstallPeraProvider
} from "./helpers/peraProviderStub";

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
    uninstallPeraProvider();
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

  it("namespaces the connector's session storage under Pera's own key", async () => {
    const pera = new PeraWalletConnect();
    const connectPromise = pera.connect();

    await flush();

    expect(FakeConnector.instances[0].opts.storageId).toBe(
      PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT
    );

    FakeConnector.instances[0].emitConnect(null, ["ADDR1"]);
    await connectPromise;
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

  describe("with window.pera present", () => {
    function clickExtensionButton() {
      // What the modal's extension button does on click: a bubbling, composed
      // event that reaches the SDK's document-level listener synchronously.
      document.dispatchEvent(
        new CustomEvent(PERA_WALLET_EXTENSION_CONNECT_EVENT, {bubbles: true})
      );
    }

    it("calls window.pera.connect() synchronously from the button click and resolves with its accounts", async () => {
      const provider = installPeraProvider(["EXT_ADDR"]);
      const pera = new PeraWalletConnect({chainId: 416002});

      const connectPromise = pera.connect();

      await flush();
      expect(FakeConnector.instances[0].opts.qrcodeModal).toBeDefined();
      expect(provider.connect).not.toHaveBeenCalled();

      clickExtensionButton();

      // Synchronous: no awaits between the gesture and the provider call.
      expect(provider.connect).toHaveBeenCalledTimes(1);
      expect(provider.connect.mock.calls[0][0]).toMatchObject({network: "testnet"});

      await expect(connectPromise).resolves.toEqual(["EXT_ADDR"]);
      expect(getWalletDetailsFromStorage()).toMatchObject({
        type: "pera-wallet-extension",
        accounts: ["EXT_ADDR"]
      });
      expect(pera.platform).toBe("extension");
    });

    it("renders the modal with the extension option enabled", async () => {
      installPeraProvider();
      const pera = new PeraWalletConnect();

      const connectPromise = pera.connect();

      await flush();

      FakeConnector.instances[0].opts.qrcodeModal.open("wc:uri");

      const wrapper = document.getElementById("pera-wallet-connect-modal-wrapper");

      expect(wrapper?.getAttribute("is-extension-enabled")).toBe("true");
      expect(
        wrapper
          ?.querySelector("pera-wallet-connect-modal")
          ?.getAttribute("is-extension-enabled")
      ).toBe("true");

      FakeConnector.instances[0].opts.qrcodeModal.close();
      FakeConnector.instances[0].emitConnect(null, ["ADDR1"]);
      await connectPromise;
    });

    it("removes the extension listener once WalletConnect pairing settles the call", async () => {
      const provider = installPeraProvider();
      const pera = new PeraWalletConnect();

      const connectPromise = pera.connect();

      await flush();
      FakeConnector.instances[0].emitConnect(null, ["ADDR1"]);
      await connectPromise;

      clickExtensionButton();

      expect(provider.connect).not.toHaveBeenCalled();
    });

    it("rejects with CONNECT_CANCELLED when the user rejects in the extension", async () => {
      const provider = installPeraProvider();

      provider.connect.mockRejectedValue(
        makePeraProviderError(PERA_PROVIDER_ERROR_CODES.USER_REJECTED)
      );
      const pera = new PeraWalletConnect();

      const connectPromise = pera.connect();

      await flush();
      clickExtensionButton();

      await expect(connectPromise).rejects.toMatchObject({
        data: {type: "CONNECT_CANCELLED"}
      });
      expect(getWalletDetailsFromStorage()).toBeNull();
    });

    it("rejects with CONNECT_NETWORK_MISMATCH when the wallet is on another network", async () => {
      const provider = installPeraProvider();

      provider.connect.mockRejectedValue(
        makePeraProviderError(PERA_PROVIDER_ERROR_CODES.NETWORK_NOT_SUPPORTED)
      );
      const pera = new PeraWalletConnect({chainId: 416001});

      const connectPromise = pera.connect();

      await flush();
      clickExtensionButton();

      await expect(connectPromise).rejects.toMatchObject({
        data: {type: "CONNECT_NETWORK_MISMATCH"}
      });
    });

    it("only answers one extension click per connect() call", async () => {
      const provider = installPeraProvider();
      const pera = new PeraWalletConnect();

      const connectPromise = pera.connect();

      await flush();
      clickExtensionButton();
      clickExtensionButton();

      expect(provider.connect).toHaveBeenCalledTimes(1);
      await connectPromise;
    });

    it("leaves the extension out when shouldPreferExtension is false", async () => {
      const provider = installPeraProvider();
      const pera = new PeraWalletConnect({shouldPreferExtension: false});

      const connectPromise = pera.connect();

      await flush();
      FakeConnector.instances[0].opts.qrcodeModal.open("wc:uri");

      expect(
        document
          .getElementById("pera-wallet-connect-modal-wrapper")
          ?.getAttribute("is-extension-enabled")
      ).toBe("false");

      clickExtensionButton();
      expect(provider.connect).not.toHaveBeenCalled();

      FakeConnector.instances[0].opts.qrcodeModal.close();
      FakeConnector.instances[0].emitConnect(null, ["ADDR1"]);
      await connectPromise;
    });

    it("still connects over WalletConnect when the user picks the QR option", async () => {
      const provider = installPeraProvider();
      const pera = new PeraWalletConnect();

      const connectPromise = pera.connect();

      await flush();
      FakeConnector.instances[0].emitConnect(null, ["ADDR1"]);

      await expect(connectPromise).resolves.toEqual(["ADDR1"]);
      expect(provider.connect).not.toHaveBeenCalled();
      expect(pera.platform).toBe("mobile");
    });
  });

  it("does not offer the extension when window.pera is absent", async () => {
    const pera = new PeraWalletConnect();

    await expect(pera.isExtensionAvailable()).resolves.toBe(false);

    const connectPromise = pera.connect();

    await flush();
    FakeConnector.instances[0].opts.qrcodeModal.open("wc:uri");

    expect(
      document
        .getElementById("pera-wallet-connect-modal-wrapper")
        ?.getAttribute("is-extension-enabled")
    ).toBe("false");

    FakeConnector.instances[0].opts.qrcodeModal.close();
    FakeConnector.instances[0].emitConnect(null, ["ADDR1"]);
    await connectPromise;
  });
});

describe("PeraWalletConnect.reconnectSession() connector options", () => {
  afterEach(() => {
    FakeConnector.instances.length = 0;
    resetWalletDetailsFromStorage();
  });

  it("rebuilds the mobile connector with the stored bridge and Pera's storage id", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");
    localStorage.setItem(
      PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT,
      JSON.stringify({bridge: "https://stored-bridge.test"})
    );

    const pera = new PeraWalletConnect();

    await pera.reconnectSession();

    expect(FakeConnector.instances).toHaveLength(1);
    expect(FakeConnector.instances[0].opts).toEqual({
      bridge: "https://stored-bridge.test",
      storageId: PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT
    });
  });
});
