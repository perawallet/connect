import {describe, it, expect} from "vitest";

import {
  getPeraWebWalletURL,
  PERA_WALLET_APP_DEEP_LINK,
  PERA_DOWNLOAD_URL,
  PERA_WALLET_SIGNATURE_PREFIX,
  PERA_WALLET_CONNECT_FALLBACK_BRIDGE
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

  describe("PERA_WALLET_CONNECT_FALLBACK_BRIDGE", () => {
    it("is Pera's repointable fallback bridge host", () => {
      // A Pera-controlled DNS name, so the bridge behind it can change without
      // an SDK release. It replaces the retired bridge.walletconnect.org.
      expect(PERA_WALLET_CONNECT_FALLBACK_BRIDGE).toBe(
        "https://wallet-connect-fallback.perawallet.app"
      );
    });
  });
});
