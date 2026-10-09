import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";

import {
  EMPTY_SIGNATURES_CAIP2_CHAIN_IDS,
  assertEmptySignaturesNetwork,
  filterEmptySignatures,
  resolveEmptySignaturesNetwork,
  withTimeout
} from "../emptySignatures";

const ACCOUNT = algosdk.generateAccount().addr.toString();
const OTHER = algosdk.generateAccount().addr.toString();

function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }

  throw new Error("Expected the call to throw");
}

describe("EMPTY_SIGNATURES_CAIP2_CHAIN_IDS", () => {
  it("matches the CAIP-2 ids use-wallet sends", () => {
    expect(EMPTY_SIGNATURES_CAIP2_CHAIN_IDS).toEqual({
      mainnet: "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k",
      testnet: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe",
      betanet: "algorand:mFgazF-2uRS1tMiL9dsj01hJGySEmPN2"
    });
  });
});

describe("assertEmptySignaturesNetwork", () => {
  it("accepts undefined and the three network names", () => {
    for (const network of [undefined, "mainnet", "testnet", "betanet"]) {
      expect(() => assertEmptySignaturesNetwork(network)).not.toThrow();
    }
  });

  it("rejects anything else with EMPTY_SIGNATURES_NETWORK_UNSUPPORTED", () => {
    expect(thrown(() => assertEmptySignaturesNetwork("localnet"))).toMatchObject({
      data: {type: "EMPTY_SIGNATURES_NETWORK_UNSUPPORTED", detail: "localnet"}
    });
  });
});

describe("resolveEmptySignaturesNetwork", () => {
  it("uses an explicit network over the chainId", () => {
    expect(resolveEmptySignaturesNetwork("testnet", 416001)).toBe("testnet");
  });

  it("maps a pinned chainId to its network", () => {
    expect(resolveEmptySignaturesNetwork(undefined, 416001)).toBe("mainnet");
    expect(resolveEmptySignaturesNetwork(undefined, 416002)).toBe("testnet");
    expect(resolveEmptySignaturesNetwork(undefined, 416003)).toBe("betanet");
  });

  it("requires a network for an all-networks session", () => {
    for (const chainId of [4160, undefined] as const) {
      expect(
        thrown(() => resolveEmptySignaturesNetwork(undefined, chainId))
      ).toMatchObject({
        data: {type: "EMPTY_SIGNATURES_NETWORK_REQUIRED"}
      });
    }
  });
});

describe("filterEmptySignatures", () => {
  it("keeps standard base64 values for the session's accounts", () => {
    expect(filterEmptySignatures({[ACCOUNT]: "gA=="}, [ACCOUNT])).toEqual({
      [ACCOUNT]: "gA=="
    });
  });

  it("drops other addresses, non-strings, base64url and empty strings", () => {
    expect(filterEmptySignatures({[OTHER]: "gA=="}, [ACCOUNT])).toEqual({});
    expect(filterEmptySignatures({[ACCOUNT]: 42}, [ACCOUNT])).toEqual({});
    expect(filterEmptySignatures({[ACCOUNT]: "gaN-_w"}, [ACCOUNT])).toEqual({});
    expect(filterEmptySignatures({[ACCOUNT]: ""}, [ACCOUNT])).toEqual({});
  });

  it("ignores inherited keys", () => {
    const result = Object.create({[ACCOUNT]: "gA=="});

    expect(filterEmptySignatures(result, [ACCOUNT])).toEqual({});
  });

  it("throws EMPTY_SIGNATURES when the result isn't a plain object", () => {
    for (const result of [null, undefined, "gA==", 1, [ACCOUNT]]) {
      expect(thrown(() => filterEmptySignatures(result, [ACCOUNT]))).toMatchObject({
        data: {type: "EMPTY_SIGNATURES", detail: {reason: "invalid-result"}}
      });
    }
  });
});

describe("withTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the promise's value and leaves no timer behind", async () => {
    vi.useFakeTimers();

    await expect(
      withTimeout(Promise.resolve("ok"), 1000, () => new Error("late"))
    ).resolves.toBe("ok");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects with the onTimeout error once the time is up", async () => {
    vi.useFakeTimers();

    const pending = withTimeout(
      new Promise(() => undefined),
      1000,
      () => new Error("late")
    );
    const assertion = expect(pending).rejects.toThrow("late");

    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
