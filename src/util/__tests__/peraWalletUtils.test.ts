import {describe, it, expect, vi, beforeEach} from "vitest";

import {
  generatePeraWalletAppDeepLink,
  generatePeraWalletConnectDeepLink,
  generateEmbeddedWalletURL
} from "../peraWalletUtils";

const deviceMock = {
  detectBrowser: vi.fn<[], string | null>(() => "Chrome"),
  isIOS: vi.fn(() => false),
  isAndroid: vi.fn(() => false)
};

vi.mock("../device/deviceUtils", () => ({
  detectBrowser: () => deviceMock.detectBrowser(),
  isIOS: () => deviceMock.isIOS(),
  isAndroid: () => deviceMock.isAndroid()
}));

describe("peraWalletUtils", () => {
  beforeEach(() => {
    deviceMock.detectBrowser.mockReturnValue("Chrome");
    deviceMock.isIOS.mockReturnValue(false);
    deviceMock.isAndroid.mockReturnValue(false);
  });

  describe("generatePeraWalletAppDeepLink", () => {
    it("appends the browser name by default", () => {
      expect(generatePeraWalletAppDeepLink()).toBe("perawallet-wc://?browser=Chrome");
    });

    it("omits the browser name when disabled", () => {
      expect(generatePeraWalletAppDeepLink(false)).toBe("perawallet-wc://");
    });

    it("omits the browser query when the browser is unknown", () => {
      deviceMock.detectBrowser.mockReturnValue(null);

      expect(generatePeraWalletAppDeepLink()).toBe("perawallet-wc://");
    });
  });

  describe("generatePeraWalletConnectDeepLink", () => {
    it("builds a wc deep link with the encoded uri and browser", () => {
      const link = generatePeraWalletConnectDeepLink("wc:abc@1?bridge=x");

      expect(link).toBe(
        `perawallet-wc://wc?uri=${encodeURIComponent("wc:abc@1?bridge=x")}&browser=Chrome`
      );
    });

    it("returns the raw uri (plus browser) on Android", () => {
      deviceMock.isAndroid.mockReturnValue(true);

      const link = generatePeraWalletConnectDeepLink("wc:abc");

      expect(link).toBe("wc:abc&browser=Chrome");
    });

    it("appends singleAccount and selectedAccount params", () => {
      const link = generatePeraWalletConnectDeepLink("wc:abc", {
        singleAccount: true,
        selectedAccount: "ADDR_1"
      });

      expect(link).toContain("&singleAccount=true");
      expect(link).toContain("&selectedAccount=ADDR_1");
    });

    it("ignores a selectedAccount of the string 'undefined'", () => {
      const link = generatePeraWalletConnectDeepLink("wc:abc", {
        selectedAccount: "undefined"
      });

      expect(link).not.toContain("selectedAccount");
    });
  });

  describe("generateEmbeddedWalletURL", () => {
    it("appends the embedded flag", () => {
      const url = generateEmbeddedWalletURL("https://web.perawallet.app/connect");

      expect(url).toContain("embedded=true");
      expect(url).not.toContain("compactMode");
    });

    it("appends the compactMode flag when requested", () => {
      const url = generateEmbeddedWalletURL("https://web.perawallet.app/connect", true);

      expect(url).toContain("embedded=true");
      expect(url).toContain("compactMode=true");
    });
  });
});
