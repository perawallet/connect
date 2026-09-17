import {describe, it, expect, vi, afterEach, beforeEach} from "vitest";
import algosdk from "algosdk";

import {ExtensionTransport, getPeraNetworkFromChainId} from "../ExtensionTransport";
import {PERA_PROVIDER_ERROR_CODES, PeraProvider} from "../peraProviderTypes";
import {ScopeType} from "../../../util/model/peraWalletModels";
import {
  saveWalletDetailsToStorage,
  getWalletDetailsFromStorage,
  resetWalletDetailsFromStorage
} from "../../../util/storage/storageUtils";

const account = algosdk.generateAccount();
const ADDRESS = account.addr.toString();

function providerError(code: number, message = "provider error") {
  const error = new Error(message) as Error & {code: number};

  error.name = "PeraProviderError";
  error.code = code;

  return error;
}

type StubProvider = PeraProvider & {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  getAddresses: ReturnType<typeof vi.fn>;
  signTransactions: ReturnType<typeof vi.fn>;
  signData: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  emit: (event: string, params?: unknown) => void;
};

function makeProvider(): StubProvider {
  const handlers: Record<string, ((params: unknown) => void)[]> = {};

  return {
    version: "1",
    connect: vi.fn().mockResolvedValue({
      accounts: [{address: ADDRESS, name: "Main"}],
      network: "testnet"
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getAddresses: vi.fn().mockResolvedValue([]),
    signTransactions: vi.fn(),
    signData: vi.fn(),
    on: vi.fn((event: string, handler: (params: unknown) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);

      return () => {
        handlers[event] = handlers[event].filter((item) => item !== handler);
      };
    }),
    emit: (event: string, params?: unknown) => {
      (handlers[event] || []).forEach((handler) => handler(params));
    }
  } as StubProvider;
}

describe("getPeraNetworkFromChainId", () => {
  it("maps the specific chain ids and leaves all-networks unset", () => {
    expect(getPeraNetworkFromChainId(416001)).toBe("mainnet");
    expect(getPeraNetworkFromChainId(416002)).toBe("testnet");
    expect(getPeraNetworkFromChainId(416003)).toBe("betanet");
    expect(getPeraNetworkFromChainId(4160)).toBeUndefined();
    expect(getPeraNetworkFromChainId(undefined)).toBeUndefined();
  });
});

describe("ExtensionTransport", () => {
  let provider: StubProvider;

  beforeEach(() => {
    provider = makeProvider();
  });

  afterEach(() => resetWalletDetailsFromStorage());

  describe("connect()", () => {
    it("calls the provider synchronously (inside the user gesture) and returns addresses", async () => {
      const transport = new ExtensionTransport(provider, {chainId: 416002});

      const promise = transport.connect();

      // No awaits may precede the provider call: transient activation is only
      // guaranteed within the click's synchronous task.
      expect(provider.connect).toHaveBeenCalledTimes(1);

      await expect(promise).resolves.toEqual([ADDRESS]);
    });

    it("passes the dApp metadata and the pinned network", async () => {
      document.title = "My dApp";
      const transport = new ExtensionTransport(provider, {chainId: 416001});

      await transport.connect();

      const options = provider.connect.mock.calls[0][0];

      expect(options.name).toBe("My dApp");
      expect(options.network).toBe("mainnet");
    });

    it("omits network for an all-networks session", async () => {
      const transport = new ExtensionTransport(provider, {chainId: 4160});

      await transport.connect();

      expect(provider.connect.mock.calls[0][0].network).toBeUndefined();
    });

    it("persists the extension as the active platform", async () => {
      const transport = new ExtensionTransport(provider, {});

      await transport.connect();

      expect(getWalletDetailsFromStorage()).toMatchObject({
        type: "pera-wallet-extension",
        accounts: [ADDRESS]
      });
      expect(transport.network).toBe("testnet");
    });

    it("maps user rejection to CONNECT_CANCELLED", async () => {
      provider.connect.mockRejectedValue(
        providerError(PERA_PROVIDER_ERROR_CODES.USER_REJECTED)
      );
      const transport = new ExtensionTransport(provider, {});

      await expect(transport.connect()).rejects.toMatchObject({
        name: "PeraWalletConnectError",
        data: {type: "CONNECT_CANCELLED"}
      });
      expect(getWalletDetailsFromStorage()).toBeNull();
    });

    it("maps a network mismatch to CONNECT_NETWORK_MISMATCH", async () => {
      provider.connect.mockRejectedValue(
        providerError(PERA_PROVIDER_ERROR_CODES.NETWORK_NOT_SUPPORTED)
      );
      const transport = new ExtensionTransport(provider, {chainId: 416001});

      await expect(transport.connect()).rejects.toMatchObject({
        data: {type: "CONNECT_NETWORK_MISMATCH"}
      });
    });

    it("maps a missing user gesture to SESSION_CONNECT with the provider's message", async () => {
      provider.connect.mockRejectedValue(
        providerError(PERA_PROVIDER_ERROR_CODES.UNAUTHORIZED, "user activation required")
      );
      const transport = new ExtensionTransport(provider, {});

      await expect(transport.connect()).rejects.toMatchObject({
        data: {type: "SESSION_CONNECT"},
        message: expect.stringContaining("user activation required")
      });
    });

    it("maps a wallet timeout to MESSAGE_NOT_RECEIVED", async () => {
      provider.connect.mockRejectedValue(
        providerError(PERA_PROVIDER_ERROR_CODES.TIMED_OUT)
      );
      const transport = new ExtensionTransport(provider, {});

      await expect(transport.connect()).rejects.toMatchObject({
        data: {type: "MESSAGE_NOT_RECEIVED"}
      });
    });
  });

  describe("reconnect()", () => {
    it("resolves the stored accounts when the origin is already approved", async () => {
      const transport = new ExtensionTransport(provider, {chainId: 416002});

      await expect(transport.reconnect()).resolves.toEqual([ADDRESS]);
      expect(getWalletDetailsFromStorage()?.type).toBe("pera-wallet-extension");
    });

    it("treats UNAUTHORIZED as no session rather than an error", async () => {
      saveWalletDetailsToStorage([ADDRESS], "pera-wallet-extension");
      provider.connect.mockRejectedValue(
        providerError(PERA_PROVIDER_ERROR_CODES.UNAUTHORIZED)
      );
      const transport = new ExtensionTransport(provider, {});

      await expect(transport.reconnect()).resolves.toEqual([]);
      expect(getWalletDetailsFromStorage()).toBeNull();
    });

    it("surfaces other failures as SESSION_RECONNECT", async () => {
      provider.connect.mockRejectedValue(
        providerError(PERA_PROVIDER_ERROR_CODES.INTERNAL_ERROR)
      );
      const transport = new ExtensionTransport(provider, {});

      await expect(transport.reconnect()).rejects.toMatchObject({
        data: {type: "SESSION_RECONNECT"}
      });
    });
  });

  describe("disconnect()", () => {
    it("calls the provider and clears storage even when the provider fails", async () => {
      saveWalletDetailsToStorage([ADDRESS], "pera-wallet-extension");
      provider.disconnect.mockRejectedValue(
        providerError(PERA_PROVIDER_ERROR_CODES.UNAUTHORIZED)
      );
      const transport = new ExtensionTransport(provider, {});

      await expect(transport.disconnect()).resolves.toBeUndefined();
      expect(provider.disconnect).toHaveBeenCalled();
      expect(getWalletDetailsFromStorage()).toBeNull();
    });
  });

  describe("wallet-initiated notifications", () => {
    it("subscribes once per provider and forwards disconnect after clearing the session", () => {
      saveWalletDetailsToStorage([ADDRESS], "pera-wallet-extension");
      const onDisconnect = vi.fn();
      const transport = new ExtensionTransport(provider, {onDisconnect});

      expect(provider.on).toHaveBeenCalledWith("disconnect", expect.any(Function));
      expect(
        provider.on.mock.calls.filter(([event]: [string]) => event === "disconnect")
      ).toHaveLength(1);

      provider.emit("disconnect");

      expect(getWalletDetailsFromStorage()).toBeNull();
      expect(onDisconnect).toHaveBeenCalledTimes(1);
      expect(transport.network).toBeNull();
    });

    it("leaves a mobile session alone when the extension reports a disconnect", () => {
      saveWalletDetailsToStorage([ADDRESS], "pera-wallet");
      const onDisconnect = vi.fn();

      const transport = new ExtensionTransport(provider, {onDisconnect});

      provider.emit("disconnect");
      expect(transport.network).toBeNull();

      expect(getWalletDetailsFromStorage()?.type).toBe("pera-wallet");
      expect(onDisconnect).not.toHaveBeenCalled();
    });

    it("forwards networkChanged with the new network", () => {
      saveWalletDetailsToStorage([ADDRESS], "pera-wallet-extension");

      const onNetworkChanged = vi.fn();
      const transport = new ExtensionTransport(provider, {onNetworkChanged});

      provider.emit("networkChanged", {network: "mainnet"});

      expect(onNetworkChanged).toHaveBeenCalledWith({network: "mainnet"});
      expect(transport.network).toBe("mainnet");
    });

    it("ignores networkChanged when the session is not an extension one", () => {
      saveWalletDetailsToStorage([ADDRESS], "pera-wallet");

      const onNetworkChanged = vi.fn();
      const transport = new ExtensionTransport(provider, {onNetworkChanged});

      provider.emit("networkChanged", {network: "mainnet"});

      expect(onNetworkChanged).not.toHaveBeenCalled();
      expect(transport.network).toBeNull();
    });

    it("dispose() unsubscribes from the provider", () => {
      const onDisconnect = vi.fn();
      const transport = new ExtensionTransport(provider, {onDisconnect});

      transport.dispose();
      saveWalletDetailsToStorage([ADDRESS], "pera-wallet-extension");
      provider.emit("disconnect");

      expect(onDisconnect).not.toHaveBeenCalled();
      expect(getWalletDetailsFromStorage()).not.toBeNull();
    });
  });
});
