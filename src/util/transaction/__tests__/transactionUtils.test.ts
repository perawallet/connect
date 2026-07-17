import {describe, it, expect, vi, beforeEach} from "vitest";

import {SignerTransaction} from "../../model/peraWalletModels";
import {
  base64ToUint8Array,
  composeTransaction,
  formatJsonRpcRequest
} from "../transactionUtils";

vi.mock("algosdk", () => ({
  default: {
    encodeUnsignedTransaction: vi.fn(() => new Uint8Array([1, 2, 3]))
  }
}));

// base64 of the bytes [1, 2, 3]
const ENCODED_TXN = Buffer.from([1, 2, 3]).toString("base64");

function makeSignerTransaction(
  overrides: Partial<SignerTransaction> = {}
): SignerTransaction {
  return {
    // The txn is passed to the mocked algosdk.encodeUnsignedTransaction, so its
    // shape does not matter here.
    txn: {} as SignerTransaction["txn"],
    ...overrides
  };
}

describe("transactionUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("base64ToUint8Array", () => {
    it("decodes base64 into the original bytes", () => {
      const input = Buffer.from([10, 20, 30, 40]).toString("base64");

      expect(Array.from(base64ToUint8Array(input))).toEqual([10, 20, 30, 40]);
    });

    it("returns an empty Uint8Array for an empty string", () => {
      const result = base64ToUint8Array("");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result).toHaveLength(0);
    });
  });

  describe("formatJsonRpcRequest", () => {
    it("wraps the method and params in a JSON-RPC 2.0 envelope", () => {
      const params = [{foo: "bar"}];
      const request = formatJsonRpcRequest("algo_signTxn", params);

      expect(request).toMatchObject({
        jsonrpc: "2.0",
        method: "algo_signTxn",
        params
      });
      expect(typeof request.id).toBe("number");
    });
  });

  describe("composeTransaction", () => {
    it("always includes the base64-encoded txn", () => {
      const result = composeTransaction(makeSignerTransaction());

      expect(result.txn).toBe(ENCODED_TXN);
    });

    it("passes through an explicit empty signers array (external signer slot)", () => {
      const result = composeTransaction(makeSignerTransaction({signers: []}));

      expect(result.signers).toEqual([]);
    });

    it("passes through an explicit signers list unchanged", () => {
      const result = composeTransaction(
        makeSignerTransaction({signers: ["OTHER_ADDRESS"]}),
        "SIGNER_ADDRESS"
      );

      expect(result.signers).toEqual(["OTHER_ADDRESS"]);
    });

    it("passes through the signers list even when it includes the signer address", () => {
      const result = composeTransaction(
        makeSignerTransaction({signers: ["SIGNER_ADDRESS"]}),
        "SIGNER_ADDRESS"
      );

      expect(result.signers).toEqual(["SIGNER_ADDRESS"]);
    });

    it("adds an empty signers array when there is no explicit list and a signer address is given", () => {
      const result = composeTransaction(makeSignerTransaction(), "SIGNER_ADDRESS");

      expect(result.signers).toEqual([]);
    });

    it("omits signers entirely when there is no explicit list and no signer address", () => {
      const result = composeTransaction(makeSignerTransaction());

      expect(result.signers).toBeUndefined();
    });

    it("passes through authAddr, message, and msig when present", () => {
      const msig = {version: 1, threshold: 1, addrs: ["A"]};
      const result = composeTransaction(
        makeSignerTransaction({
          authAddr: "AUTH_ADDRESS",
          message: "hello",
          msig
        })
      );

      expect(result.authAddr).toBe("AUTH_ADDRESS");
      expect(result.message).toBe("hello");
      expect(result.msig).toEqual(msig);
    });

    it("omits optional fields when they are absent", () => {
      const result = composeTransaction(makeSignerTransaction());

      expect(result.authAddr).toBeUndefined();
      expect(result.message).toBeUndefined();
      expect(result.msig).toBeUndefined();
    });
  });
});
