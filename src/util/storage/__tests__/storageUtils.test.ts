import {describe, it, expect, beforeEach, vi} from "vitest";

import {
  saveWalletDetailsToStorage,
  getWalletDetailsFromStorage,
  getWalletConnectObjectFromStorage,
  resetWalletDetailsFromStorage,
  getWalletPlatformFromStorage
} from "../storageUtils";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "../storageConstants";

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

  describe("resetWalletDetailsFromStorage", () => {
    it("removes both wallet and walletconnect keys", async () => {
      saveWalletDetailsToStorage(["ADDR_1"]);
      localStorage.setItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT, "{}");

      await resetWalletDetailsFromStorage();

      expect(localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLET)).toBeNull();
      expect(
        localStorage.getItem(PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT)
      ).toBeNull();
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
});
