import {describe, it, expect, beforeEach, afterEach, vi} from "vitest";

import {
  saveWalletDetailsToStorage,
  getWalletDetailsFromStorage,
  getWalletConnectObjectFromStorage,
  resetWalletDetailsFromStorage,
  getWalletPlatformFromStorage,
  migrateLegacyWalletConnectSession
} from "../storageUtils";
import {
  PERA_WALLET_LOCAL_STORAGE_KEYS,
  LEGACY_WALLETCONNECT_STORAGE_KEY
} from "../storageConstants";

// Shape of a persisted WalletConnect v1 session (IWalletConnectSession).
const LEGACY_SESSION = {
  connected: true,
  accounts: ["ADDR_1", "ADDR_2"],
  chainId: 4160,
  bridge: "https://bridge.test",
  key: "",
  clientId: "client-id",
  clientMeta: null,
  peerId: "peer-id",
  peerMeta: null,
  handshakeId: 0,
  handshakeTopic: ""
};

function seedLegacySession(session: unknown = LEGACY_SESSION) {
  const raw = typeof session === "string" ? session : JSON.stringify(session);

  localStorage.setItem(LEGACY_WALLETCONNECT_STORAGE_KEY, raw);

  return raw;
}

describe("storageUtils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("saveWalletDetailsToStorage / getWalletDetailsFromStorage", () => {
    it("round-trips wallet details and defaults type to pera-wallet", () => {
      saveWalletDetailsToStorage(["ADDR_1", "ADDR_2"]);

      expect(getWalletDetailsFromStorage()).toEqual({
        type: "pera-wallet",
        accounts: ["ADDR_1", "ADDR_2"],
        selectedAccount: "ADDR_1"
      });
    });

    it("stores the provided platform type", () => {
      saveWalletDetailsToStorage(["ADDR_1"], "pera-wallet-web");

      expect(getWalletDetailsFromStorage()?.type).toBe("pera-wallet-web");
    });

    it("sets selectedAccount to the first account", () => {
      saveWalletDetailsToStorage(["FIRST", "SECOND"]);

      expect(getWalletDetailsFromStorage()?.selectedAccount).toBe("FIRST");
    });

    it("returns null when nothing has been stored", () => {
      expect(getWalletDetailsFromStorage()).toBeNull();
    });
  });

  describe("getWalletConnectObjectFromStorage", () => {
    it("parses the stored walletconnect session", () => {
      const session = {connected: true, accounts: ["ADDR_1"]};

      localStorage.setItem(
        PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT,
        JSON.stringify(session)
      );

      expect(getWalletConnectObjectFromStorage()).toMatchObject(session);
    });

    it("returns null when no session is stored", () => {
      expect(getWalletConnectObjectFromStorage()).toBeNull();
    });
  });

  describe("PERA_WALLET_LOCAL_STORAGE_KEYS", () => {
    it("namespaces the walletconnect session key under PeraWallet", () => {
      // The WalletConnect v1 default key "walletconnect" is shared by every
      // WC v1 wallet library on the same origin; Pera must not use it.
      expect(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT).toBe(
        "PeraWallet.WalletConnect"
      );
    });
  });

  describe("resetWalletDetailsFromStorage", () => {
    it("removes the namespaced wallet and walletconnect keys", async () => {
      saveWalletDetailsToStorage(["ADDR_1"]);
      localStorage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT, "{}");

      await resetWalletDetailsFromStorage();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET)).toBeNull();
      expect(
        localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)
      ).toBeNull();
    });

    it("leaves a foreign session under the shared walletconnect key untouched", async () => {
      saveWalletDetailsToStorage(["ADDR_1"]);
      localStorage.setItem("walletconnect", "foreign");

      await resetWalletDetailsFromStorage();

      expect(localStorage.getItem("walletconnect")).toBe("foreign");
    });

    it("rejects when removing from storage throws", async () => {
      const removeItemSpy = vi
        .spyOn(Storage.prototype, "removeItem")
        .mockImplementation(() => {
          throw new Error("storage unavailable");
        });

      await expect(resetWalletDetailsFromStorage()).rejects.toThrow(
        "storage unavailable"
      );

      removeItemSpy.mockRestore();
    });
  });

  describe("migrateLegacyWalletConnectSession", () => {
    it("moves a Pera-owned session from the shared key to the namespaced key verbatim", () => {
      saveWalletDetailsToStorage(["ADDR_1", "ADDR_2"], "pera-wallet");
      const raw = seedLegacySession();

      migrateLegacyWalletConnectSession();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBe(raw);
      expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBeNull();
    });

    it("does nothing when a namespaced session already exists", () => {
      saveWalletDetailsToStorage(["ADDR_1", "ADDR_2"], "pera-wallet");
      localStorage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT, "{\"bridge\":\"x\"}");
      const raw = seedLegacySession();

      migrateLegacyWalletConnectSession();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBe(
        "{\"bridge\":\"x\"}"
      );
      expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBe(raw);
    });

    it("removes a stale legacy copy when the namespaced key already holds the identical session", () => {
      // A previous run that copied but failed to remove leaves both keys equal;
      // byte-identical means it can only be Pera's own session.
      saveWalletDetailsToStorage(["ADDR_1", "ADDR_2"], "pera-wallet");
      const raw = seedLegacySession();

      localStorage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT, raw);

      migrateLegacyWalletConnectSession();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBe(raw);
      expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBeNull();
    });

    it("leaves a foreign session whose accounts differ from Pera's untouched", () => {
      saveWalletDetailsToStorage(["ADDR_1", "ADDR_2"], "pera-wallet");
      const raw = seedLegacySession({...LEGACY_SESSION, accounts: ["0xEVM"]});

      migrateLegacyWalletConnectSession();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBeNull();
      expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBe(raw);
    });

    it("treats the same accounts in a different order as a different session", () => {
      saveWalletDetailsToStorage(["ADDR_1", "ADDR_2"], "pera-wallet");
      const raw = seedLegacySession({...LEGACY_SESSION, accounts: ["ADDR_2", "ADDR_1"]});

      migrateLegacyWalletConnectSession();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBeNull();
      expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBe(raw);
    });

    it("skips when no Pera wallet details are stored", () => {
      const raw = seedLegacySession();

      migrateLegacyWalletConnectSession();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBeNull();
      expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBe(raw);
    });

    it("skips when the stored Pera platform is not mobile", () => {
      saveWalletDetailsToStorage(["ADDR_1", "ADDR_2"], "pera-wallet-web");
      const raw = seedLegacySession();

      migrateLegacyWalletConnectSession();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBeNull();
      expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBe(raw);
    });

    it("skips when both account lists are empty", () => {
      saveWalletDetailsToStorage([], "pera-wallet");
      const raw = seedLegacySession({...LEGACY_SESSION, accounts: []});

      migrateLegacyWalletConnectSession();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBeNull();
      expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBe(raw);
    });

    it("skips when the legacy value is not valid JSON", () => {
      saveWalletDetailsToStorage(["ADDR_1", "ADDR_2"], "pera-wallet");
      const raw = seedLegacySession("{not valid json");

      migrateLegacyWalletConnectSession();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBeNull();
      expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBe(raw);
    });

    it("skips when the legacy bridge is not a string", () => {
      saveWalletDetailsToStorage(["ADDR_1", "ADDR_2"], "pera-wallet");
      const raw = seedLegacySession({...LEGACY_SESSION, bridge: 123});

      migrateLegacyWalletConnectSession();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBeNull();
      expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBe(raw);
    });

    it("skips when the legacy session has no bridge", () => {
      saveWalletDetailsToStorage(["ADDR_1", "ADDR_2"], "pera-wallet");
      const {bridge: _bridge, ...withoutBridge} = LEGACY_SESSION;
      const raw = seedLegacySession(withoutBridge);

      migrateLegacyWalletConnectSession();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)).toBeNull();
      expect(localStorage.getItem(LEGACY_WALLETCONNECT_STORAGE_KEY)).toBe(raw);
    });

    it("never throws, even when storage access fails", () => {
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("storage unavailable");
      });

      try {
        expect(() => migrateLegacyWalletConnectSession()).not.toThrow();
      } finally {
        getItemSpy.mockRestore();
      }
    });
  });

  describe("getWalletPlatformFromStorage", () => {
    it("returns 'mobile' for a pera-wallet session", () => {
      saveWalletDetailsToStorage(["ADDR_1"], "pera-wallet");

      expect(getWalletPlatformFromStorage()).toBe("mobile");
    });

    it("returns 'web' for a pera-wallet-web session", () => {
      saveWalletDetailsToStorage(["ADDR_1"], "pera-wallet-web");

      expect(getWalletPlatformFromStorage()).toBe("web");
    });

    it("returns null when no wallet details are stored", () => {
      expect(getWalletPlatformFromStorage()).toBeNull();
    });
  });

  describe("extension platform mapping", () => {
    afterEach(() => resetWalletDetailsFromStorage());

    it("maps the pera-wallet-extension type to the 'extension' platform", () => {
      saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

      expect(getWalletPlatformFromStorage()).toBe("extension");
    });
  });
});
