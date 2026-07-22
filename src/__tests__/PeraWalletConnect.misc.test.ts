import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";
import {sign_detached} from "tweetnacl-ts";

import PeraWalletConnect from "../PeraWalletConnect";
import {concatArrays} from "../util/array/arrayUtils";
import {PERA_WALLET_SIGNATURE_PREFIX} from "../util/peraWalletConstants";
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

const getPublicSettingsMock = vi.fn();

vi.mock("../util/webview-api/webviewApi", () => ({
  getPublicSettings: () => getPublicSettingsMock()
}));

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true
  });
}

const DESKTOP_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15";

describe("PeraWalletConnect constructor", () => {
  afterEach(() => setUserAgent(DESKTOP_UA));

  it("applies documented defaults when no options are given", () => {
    const pera = new PeraWalletConnect();

    expect(pera.bridge).toBe("");
    expect(pera.connector).toBeNull();
    expect(pera.shouldShowSignTxnToast).toBe(true);
    expect(pera.isInWebview).toBe(false);
    expect(pera.chainId).toBeUndefined();
    expect(pera.compactMode).toBe(false);
    expect(pera.singleAccount).toBe(false);
    expect(pera.shouldPreferExtension).toBe(true);
  });

  it("honors every overridable option", () => {
    // eslint-disable-next-line no-magic-numbers
    const pera = new PeraWalletConnect({
      bridge: "https://custom-bridge.test",
      shouldShowSignTxnToast: false,
      chainId: 416001,
      compactMode: true,
      singleAccount: true,
      shouldPreferExtension: false,
      experimental: true
    });

    expect(pera.bridge).toBe("https://custom-bridge.test");
    expect(pera.shouldShowSignTxnToast).toBe(false);
    // eslint-disable-next-line no-magic-numbers
    expect(pera.chainId).toBe(416001);
    expect(pera.compactMode).toBe(true);
    expect(pera.singleAccount).toBe(true);
    expect(pera.shouldPreferExtension).toBe(false);
  });
});

describe("PeraWalletConnect.isConnected", () => {
  afterEach(() => resetWalletDetailsFromStorage());

  it("is false when there is no stored session", () => {
    const pera = new PeraWalletConnect();

    expect(pera.isConnected).toBe(false);
  });

  it("mobile: true only once a connector is present", () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");

    const pera = new PeraWalletConnect();

    expect(pera.isConnected).toBe(false);

    (pera as any).connector = {};
    expect(pera.isConnected).toBe(true);
  });

  it("web: true only when accounts are stored", () => {
    const pera = new PeraWalletConnect();

    saveWalletDetailsToStorage([], "pera-wallet-web");
    expect(pera.isConnected).toBe(false);

    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-web");
    expect(pera.isConnected).toBe(true);
  });

  it("extension: true only when accounts are stored", () => {
    const pera = new PeraWalletConnect();

    saveWalletDetailsToStorage([], "pera-wallet-extension");
    expect(pera.isConnected).toBe(false);

    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");
    expect(pera.isConnected).toBe(true);
  });
});

describe("PeraWalletConnect.isPeraDiscoverBrowser", () => {
  afterEach(() => setUserAgent(DESKTOP_UA));

  it("is true when the user agent identifies the Pera Discover browser", () => {
    setUserAgent("PeraDiscoverBrowser/1.0 (pera; iOS)");

    const pera = new PeraWalletConnect();

    expect(pera.isPeraDiscoverBrowser).toBe(true);
  });

  it("is false otherwise", () => {
    setUserAgent(DESKTOP_UA);

    const pera = new PeraWalletConnect();

    expect(pera.isPeraDiscoverBrowser).toBe(false);
  });
});

describe("PeraWalletConnect.verifySignature", () => {
  it("verifies a signature produced over the MX-prefixed data", () => {
    const account = algosdk.generateAccount();
    const data = new Uint8Array([1, 2, 3]);
    const signature = sign_detached(
      concatArrays(new Uint8Array(PERA_WALLET_SIGNATURE_PREFIX), data),
      account.sk
    );

    const pera = new PeraWalletConnect();

    expect(pera.verifySignature(data, signature, account.addr.toString())).toBe(true);
  });

  it("rejects a signature over the wrong data", () => {
    const account = algosdk.generateAccount();
    const data = new Uint8Array([1, 2, 3]);
    const signature = sign_detached(
      concatArrays(
        new Uint8Array(PERA_WALLET_SIGNATURE_PREFIX),
        new Uint8Array([9, 9, 9])
      ),
      account.sk
    );

    const pera = new PeraWalletConnect();

    expect(pera.verifySignature(data, signature, account.addr.toString())).toBe(false);
  });

  it("returns false instead of throwing for an invalid signer address", () => {
    const pera = new PeraWalletConnect();

    expect(
      pera.verifySignature(new Uint8Array([1]), new Uint8Array(64), "not-an-address")
    ).toBe(false);
  });
});

describe("PeraWalletConnect.verifyArc60Signature", () => {
  async function signArc60(
    account: algosdk.Account,
    data: Uint8Array,
    authenticatorData: Uint8Array
  ) {
    const dataHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", Buffer.from(data))
    );
    const authHash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", Buffer.from(authenticatorData))
    );

    return sign_detached(concatArrays(dataHash, authHash), account.sk);
  }

  it("verifies a valid ARC-60 signature", async () => {
    const account = algosdk.generateAccount();
    const data = new Uint8Array([1, 2, 3]);
    const authenticatorData = new Uint8Array(37);
    const signature = await signArc60(account, data, authenticatorData);

    const pera = new PeraWalletConnect();

    await expect(
      pera.verifyArc60Signature(
        data,
        authenticatorData,
        signature,
        account.addr.toString()
      )
    ).resolves.toBe(true);
  });

  it("rejects an ARC-60 signature over mismatched authenticatorData", async () => {
    const account = algosdk.generateAccount();
    const data = new Uint8Array([1, 2, 3]);
    const signature = await signArc60(account, data, new Uint8Array(37));

    const pera = new PeraWalletConnect();

    await expect(
      pera.verifyArc60Signature(
        data,
        new Uint8Array(38),
        signature,
        account.addr.toString()
      )
    ).resolves.toBe(false);
  });
});

describe("PeraWalletConnect webview detection (checkIsInWebview, via reconnectSession)", () => {
  afterEach(() => {
    setUserAgent(DESKTOP_UA);
    getPublicSettingsMock.mockReset();
    resetWalletDetailsFromStorage();
  });

  it("stays false on a non-mobile user agent without probing the bridge", async () => {
    setUserAgent(DESKTOP_UA);
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");

    const pera = new PeraWalletConnect();

    await pera.reconnectSession();

    expect(pera.isInWebview).toBe(false);
    expect(getPublicSettingsMock).not.toHaveBeenCalled();
  });

  it("becomes true on a mobile user agent when the native bridge answers", async () => {
    setUserAgent(IPHONE_UA);
    getPublicSettingsMock.mockResolvedValue({});
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");

    const pera = new PeraWalletConnect();

    await pera.reconnectSession();

    expect(pera.isInWebview).toBe(true);
  });

  it("falls back to false when the native bridge check throws", async () => {
    setUserAgent(IPHONE_UA);
    getPublicSettingsMock.mockRejectedValue(new Error("no bridge"));
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet");

    const pera = new PeraWalletConnect();

    await pera.reconnectSession();

    expect(pera.isInWebview).toBe(false);
  });
});
