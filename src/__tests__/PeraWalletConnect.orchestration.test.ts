import {describe, it, expect, vi, afterEach} from "vitest";

import PeraWalletConnect from "../PeraWalletConnect";
import {
  saveWalletDetailsToStorage,
  resetWalletDetailsFromStorage
} from "../util/storage/storageUtils";

vi.mock("../util/api/peraWalletConnectApi", () => ({
  getPeraConnectConfig: () =>
    Promise.resolve({
      isWebWalletAvailable: false,
      bridgeURL: "https://bridge.test",
      webWalletURL: "https://web.test",
      shouldDisplayNewBadge: false,
      shouldUseSound: false,
      silent: true,
      promoteMobile: false
    })
}));

describe("PeraWalletConnect orchestration", () => {
  afterEach(() => {
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("routes signTransaction to the extension transport when platform is extension", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

    const pera = new PeraWalletConnect();
    const spy = vi
      .spyOn((pera as any).extensionTransport, "signTransaction")
      .mockResolvedValue([new Uint8Array([1])]);

    await pera.signTransaction([[]]);

    expect(spy).toHaveBeenCalled();
  });

  it("isExtensionAvailable resolves false when nothing answers discover", async () => {
    const pera = new PeraWalletConnect({experimental: true});

    await expect(pera.isExtensionAvailable()).resolves.toBe(false);
  });

  it("does not probe for the extension when experimental support is off", async () => {
    const pera = new PeraWalletConnect();
    const discoverSpy = vi.spyOn((pera as any).arc0027Client, "discover");

    await expect(pera.isExtensionAvailable()).resolves.toBe(false);
    expect(discoverSpy).not.toHaveBeenCalled();
  });

  it("probes discover when experimental extension support is on", async () => {
    const pera = new PeraWalletConnect({experimental: true});
    const discoverSpy = vi
      .spyOn((pera as any).arc0027Client, "discover")
      .mockResolvedValue({providerId: "pera", name: "Pera", networks: []});

    await expect(pera.isExtensionAvailable()).resolves.toBe(true);
    expect(discoverSpy).toHaveBeenCalled();
  });

  it("treats a stored extension session as no session when experimental support is off", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

    const pera = new PeraWalletConnect();
    const reconnectSpy = vi.spyOn((pera as any).extensionTransport, "reconnect");

    await expect(pera.reconnectSession()).resolves.toEqual([]);
    expect(reconnectSpy).not.toHaveBeenCalled();
    expect(pera.platform).toBeNull();
  });
});
