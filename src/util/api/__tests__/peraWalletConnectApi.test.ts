import {describe, it, expect, vi, afterEach, beforeEach} from "vitest";

import {getPeraConnectConfig, fetchPeraConnectConfig} from "../peraWalletConnectApi";

function stubFetchResolving(body: unknown) {
  const fetchMock = vi.fn(() =>
    Promise.resolve({json: () => Promise.resolve(body)} as unknown as Response)
  );

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

describe("peraWalletConnectApi", () => {
  beforeEach(() => {
    // Keep the intentional console.log in the catch path from cluttering output.
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("fetchPeraConnectConfig", () => {
    it("requests the config URL with no-store caching", async () => {
      const fetchMock = stubFetchResolving({});

      await fetchPeraConnectConfig();

      expect(fetchMock).toHaveBeenCalledWith("https://wc.perawallet.app/config.json", {
        cache: "no-store"
      });
    });
  });

  describe("getPeraConnectConfig", () => {
    it("maps a fully populated response into the config shape", async () => {
      stubFetchResolving({
        web_wallet: true,
        web_wallet_url: "web.perawallet.app",
        display_new_badge: true,
        use_sound: false,
        silent: true,
        promote_mobile: true,
        servers: ["https://bridge.example.com"]
      });

      const config = await getPeraConnectConfig();

      expect(config).toEqual({
        bridgeURL: "https://bridge.example.com",
        webWalletURL: "web.perawallet.app",
        isWebWalletAvailable: true,
        shouldDisplayNewBadge: true,
        shouldUseSound: false,
        silent: true,
        promoteMobile: true
      });
    });

    it("returns sensible defaults for an empty response", async () => {
      stubFetchResolving({});

      const config = await getPeraConnectConfig();

      expect(config).toEqual({
        bridgeURL: "",
        webWalletURL: "",
        isWebWalletAvailable: false,
        shouldDisplayNewBadge: false,
        shouldUseSound: true,
        silent: false,
        promoteMobile: false
      });
    });

    it("keeps web wallet unavailable when the url is missing", async () => {
      stubFetchResolving({web_wallet: true});

      const config = await getPeraConnectConfig();

      expect(config.isWebWalletAvailable).toBe(false);
    });

    it("falls back to defaults when the request rejects", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(new Error("network down")))
      );

      const config = await getPeraConnectConfig();

      expect(config.bridgeURL).toBe("");
      expect(config.isWebWalletAvailable).toBe(false);
      expect(console.log).toHaveBeenCalled();
    });
  });
});
