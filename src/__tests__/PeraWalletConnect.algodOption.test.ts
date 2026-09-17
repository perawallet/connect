import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import algosdk from "algosdk";

import PeraWalletConnect from "../PeraWalletConnect";
import {MAINNET_NODE_CHAIN_ID, TESTNET_NODE_CHAIN_ID} from "../util/algod/algodConstants";

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

const account = algosdk.generateAccount();
const accountAddress = account.addr.toString();

/**
 * Captures the algod HTTP calls algosdk makes, so tests can assert which node
 * connect actually talked to rather than mocking our own client away.
 */
function captureAlgodRequests() {
  const requests: {url: string; headers: Record<string, string>}[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn((url: unknown, init?: {headers?: Record<string, string>}) => {
      requests.push({url: String(url), headers: {...(init?.headers ?? {})}});

      return Promise.resolve(
        new Response(JSON.stringify({address: accountAddress, amount: 0}), {
          status: 200,
          headers: {"content-type": "application/json"}
        })
      );
    })
  );

  return requests;
}

describe("PeraWalletConnect algod option", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reads the account from the default public node when no client is given", async () => {
    const requests = captureAlgodRequests();
    const pera = new PeraWalletConnect({chainId: MAINNET_NODE_CHAIN_ID});

    await pera.resolveArc60Signer(accountAddress);

    expect(requests[0].url).toContain("mainnet-api.algonode.cloud");
  });

  it("sends no API token by default, so none ships in the bundle", async () => {
    const requests = captureAlgodRequests();
    const pera = new PeraWalletConnect({chainId: MAINNET_NODE_CHAIN_ID});

    await pera.resolveArc60Signer(accountAddress);

    expect(requests[0].headers).not.toHaveProperty("X-Algo-API-Token");
  });

  it("reads the account from the supplied client instead of Pera's node", async () => {
    const requests = captureAlgodRequests();
    const pera = new PeraWalletConnect({
      chainId: MAINNET_NODE_CHAIN_ID,
      algod: {mainnet: new algosdk.Algodv2("", "https://my-node.example.com", "")}
    });

    await pera.resolveArc60Signer(accountAddress);

    expect(requests[0].url).toContain("my-node.example.com");
    expect(requests[0].url).not.toContain("perawallet.app");
  });

  it("sends the token the supplied client was built with", async () => {
    const requests = captureAlgodRequests();
    const pera = new PeraWalletConnect({
      chainId: MAINNET_NODE_CHAIN_ID,
      algod: {
        mainnet: new algosdk.Algodv2("my-secret-token", "https://my-node.example.com", "")
      }
    });

    await pera.resolveArc60Signer(accountAddress);

    expect(requests[0].headers["X-Algo-API-Token"]).toBe("my-secret-token");
  });

  it("honours a custom token header on the supplied client", async () => {
    const requests = captureAlgodRequests();
    const pera = new PeraWalletConnect({
      chainId: MAINNET_NODE_CHAIN_ID,
      algod: {
        mainnet: new algosdk.Algodv2(
          {"X-API-Key": "key-from-my-provider"},
          "https://my-node.example.com",
          ""
        )
      }
    });

    await pera.resolveArc60Signer(accountAddress);

    expect(requests[0].headers["X-API-Key"]).toBe("key-from-my-provider");
  });

  it("honours the port the supplied client was built with", async () => {
    const requests = captureAlgodRequests();
    const pera = new PeraWalletConnect({
      chainId: TESTNET_NODE_CHAIN_ID,
      algod: {testnet: new algosdk.Algodv2("", "http://localhost", 4001)}
    });

    await pera.resolveArc60Signer(accountAddress);

    expect(requests[0].url).toContain("http://localhost:4001/");
  });

  it("keeps Pera's node for a network the option omits", async () => {
    const requests = captureAlgodRequests();
    const pera = new PeraWalletConnect({
      chainId: TESTNET_NODE_CHAIN_ID,
      algod: {mainnet: new algosdk.Algodv2("", "https://my-node.example.com", "")}
    });

    await pera.resolveArc60Signer(accountAddress);

    expect(requests[0].url).toContain("testnet-api.algonode.cloud");
  });

  it("uses each network's own client", async () => {
    const requests = captureAlgodRequests();
    const pera = new PeraWalletConnect({
      algod: {
        mainnet: new algosdk.Algodv2("", "https://my-mainnet.example.com", ""),
        testnet: new algosdk.Algodv2("", "https://my-testnet.example.com", "")
      }
    });

    await pera.resolveArc60Signer(accountAddress, "mainnet");
    await pera.resolveArc60Signer(accountAddress, "testnet");

    expect(requests[0].url).toContain("my-mainnet.example.com");
    expect(requests[1].url).toContain("my-testnet.example.com");
  });

  it("keeps using the supplied client across repeated lookups", async () => {
    const requests = captureAlgodRequests();
    const pera = new PeraWalletConnect({
      chainId: MAINNET_NODE_CHAIN_ID,
      algod: {mainnet: new algosdk.Algodv2("", "https://my-node.example.com", "")}
    });

    await pera.resolveArc60Signer(accountAddress);
    await pera.resolveArc60Signer(accountAddress);

    expect(requests).toHaveLength(2);
    expect(requests[1].url).toContain("my-node.example.com");
  });

  it("throws at construction when the value is not an algod client", () => {
    expect(
      () =>
        new PeraWalletConnect({
          algod: {mainnet: "https://my-node.example.com" as any}
        })
    ).toThrow(/algosdk\.Algodv2/);
  });

  it("throws at construction when a network's client is null", () => {
    expect(() => new PeraWalletConnect({algod: {testnet: null as any}})).toThrow(
      /algosdk\.Algodv2/
    );
  });
});
