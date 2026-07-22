import {describe, it, expect, afterEach, vi} from "vitest";

import {isAndroid, isIOS, isMobile, detectBrowser} from "../deviceUtils";

const USER_AGENTS = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  android:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  chromeDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  firefoxDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
  duckDuckGo:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.0 DuckDuckGo/5 Safari/537.36",
  operaGX:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPX/1.0"
};

function stubUserAgent(userAgent: string) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
}

describe("deviceUtils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isAndroid / isIOS / isMobile", () => {
    it("detects iOS from an iPhone user agent", () => {
      stubUserAgent(USER_AGENTS.iphone);

      expect(isIOS()).toBe(true);
      expect(isAndroid()).toBe(false);
      expect(isMobile()).toBe(true);
    });

    it("detects Android from an Android user agent", () => {
      stubUserAgent(USER_AGENTS.android);

      expect(isAndroid()).toBe(true);
      expect(isIOS()).toBe(false);
      expect(isMobile()).toBe(true);
    });

    it("reports a desktop user agent as neither mobile platform", () => {
      stubUserAgent(USER_AGENTS.chromeDesktop);

      expect(isAndroid()).toBe(false);
      expect(isIOS()).toBe(false);
      expect(isMobile()).toBe(false);
    });
  });

  describe("detectBrowser", () => {
    it("identifies Chrome", () => {
      stubUserAgent(USER_AGENTS.chromeDesktop);

      expect(detectBrowser()).toBe("Chrome");
    });

    it("identifies Firefox", () => {
      stubUserAgent(USER_AGENTS.firefoxDesktop);

      expect(detectBrowser()).toBe("Firefox");
    });

    it("identifies DuckDuckGo", () => {
      stubUserAgent(USER_AGENTS.duckDuckGo);

      expect(detectBrowser()).toBe("DuckDuckGo");
    });

    it("identifies Opera GX", () => {
      stubUserAgent(USER_AGENTS.operaGX);

      expect(detectBrowser()).toBe("Opera GX");
    });

    it("identifies Brave via the navigator.brave marker", () => {
      stubUserAgent(USER_AGENTS.chromeDesktop);
      Object.defineProperty(window.navigator, "brave", {
        configurable: true,
        value: {}
      });

      try {
        expect(detectBrowser()).toBe("Brave");
      } finally {
        delete (window.navigator as {brave?: unknown}).brave;
      }
    });
  });
});
