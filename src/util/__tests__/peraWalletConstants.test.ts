import {describe, it, expect} from "vitest";

import {
  getPeraWebWalletURL,
  PERA_WALLET_APP_DEEP_LINK,
  PERA_DOWNLOAD_URL,
  PERA_WALLET_SIGNATURE_PREFIX,
  PERA_WALLET_CONNECT_FALLBACK_BRIDGES
} from "../peraWalletConstants";

describe("peraWalletConstants", () => {
  describe("getPeraWebWalletURL", () => {
    it("builds the root, connect, and sign URLs from a host", () => {
      expect(getPeraWebWalletURL("web.perawallet.app")).toEqual({
        ROOT: "https://web.perawallet.app",
        CONNECT: "https://web.perawallet.app/connect",
        TRANSACTION_SIGN: "https://web.perawallet.app/transaction/sign"
      });
    });
  });

  describe("constants", () => {
    it("exposes the deep link and download URL", () => {
      expect(PERA_WALLET_APP_DEEP_LINK).toBe("perawallet-wc://");
      expect(PERA_DOWNLOAD_URL).toBe("https://perawallet.app/download/");
    });

    it("uses the 'MX' byte prefix for signatures", () => {
      expect(PERA_WALLET_SIGNATURE_PREFIX).toEqual([77, 88]);
    });
  });

  describe("PERA_WALLET_CONNECT_FALLBACK_BRIDGES", () => {
    it("lists eight distinct https Pera-hosted bridges", () => {
      expect(PERA_WALLET_CONNECT_FALLBACK_BRIDGES).toHaveLength(8);
      expect(new Set(PERA_WALLET_CONNECT_FALLBACK_BRIDGES).size).toBe(8);

      for (const bridge of PERA_WALLET_CONNECT_FALLBACK_BRIDGES) {
        expect(bridge).toMatch(/^https:\/\/wallet-connect-[a-h]\.perawallet\.app$/);
      }
    });

    it("never points at the retired public WalletConnect bridge", () => {
      // The fork rewrites any walletconnect.org host to a random
      // X.bridge.walletconnect.org subdomain; none of them resolve any more.
      expect(
        PERA_WALLET_CONNECT_FALLBACK_BRIDGES.some((bridge) =>
          bridge.includes("walletconnect.org")
        )
      ).toBe(false);
    });
  });
});
