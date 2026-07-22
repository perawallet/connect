import {describe, it, expect, vi, beforeEach} from "vitest";

import PeraWalletConnectError from "../../PeraWalletConnectError";
import {newTabSignTransactionFlowTellerReducer} from "../signTransactionFlowReducers";
import {NewTabSignTransactionFlowTellerReducerParams} from "../signTransactionFlowModels";

const resetWalletDetailsFromStorage = vi.fn(() => Promise.resolve(undefined));

vi.mock("../../storage/storageUtils", () => ({
  resetWalletDetailsFromStorage: () => resetWalletDetailsFromStorage()
}));

// base64 of [1, 2, 3] and [4, 5]
const SIGNED_A = Buffer.from([1, 2, 3]).toString("base64");
const SIGNED_B = Buffer.from([4, 5]).toString("base64");

function callReducer(
  event: unknown,
  method: NewTabSignTransactionFlowTellerReducerParams["method"] = "SIGN_TXN"
) {
  const close = vi.fn();
  const resolve = vi.fn();
  const reject = vi.fn();

  newTabSignTransactionFlowTellerReducer({
    event: event as NewTabSignTransactionFlowTellerReducerParams["event"],
    method,
    resolve,
    reject,
    newPeraWalletTab: {close} as unknown as Window
  });

  return {close, resolve, reject};
}

describe("newTabSignTransactionFlowTellerReducer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves SIGN_TXN_CALLBACK with decoded signed transactions", () => {
    const {resolve, close} = callReducer({
      data: {
        message: {
          type: "SIGN_TXN_CALLBACK",
          signedTxns: [{signedTxn: SIGNED_A}, {signedTxn: SIGNED_B}]
        }
      }
    });

    expect(close).toHaveBeenCalled();
    expect(resolve).toHaveBeenCalledTimes(1);

    const decoded = (resolve.mock.calls[0][0] as Uint8Array[]).map((bytes) =>
      Array.from(bytes)
    );

    expect(decoded).toEqual([
      [1, 2, 3],
      [4, 5]
    ]);
  });

  it("resolves SIGN_DATA_CALLBACK with decoded signed data", () => {
    const {resolve} = callReducer(
      {
        data: {
          message: {
            type: "SIGN_DATA_CALLBACK",
            signedData: [{signedData: SIGNED_A}]
          }
        }
      },
      "SIGN_DATA"
    );

    const decoded = (resolve.mock.calls[0][0] as Uint8Array[]).map((bytes) =>
      Array.from(bytes)
    );

    expect(decoded).toEqual([[1, 2, 3]]);
  });

  it("rejects SIGN_TXN_NETWORK_MISMATCH with a method-scoped error", () => {
    const {reject} = callReducer({
      data: {message: {type: "SIGN_TXN_NETWORK_MISMATCH", error: "bad network"}}
    });

    const error = reject.mock.calls[0][0] as PeraWalletConnectError;

    expect(error).toBeInstanceOf(PeraWalletConnectError);
    expect(error.data.type).toBe("SIGN_TXN_NETWORK_MISMATCH");
    expect(error.message).toBe("bad network");
  });

  it("rejects SIGN_TXN_CALLBACK_ERROR as a cancellation and closes the tab", () => {
    const {reject, close} = callReducer({
      data: {message: {type: "SIGN_TXN_CALLBACK_ERROR", error: "user cancelled"}}
    });

    const error = reject.mock.calls[0][0] as PeraWalletConnectError;

    expect(close).toHaveBeenCalled();
    expect(error.data.type).toBe("SIGN_TXN_CANCELLED");
  });

  // Regression: these two case labels used to be written as
  // `case "SIGN_TXN_X" || "SIGN_DATA_X":`, which only ever matches
  // "SIGN_TXN_X" (the `||` is evaluated once, at switch-build time). The
  // SIGN_DATA_* variant silently fell through to `default: break`, leaving
  // the signData() promise pending forever instead of rejecting.
  it("rejects SIGN_DATA_NETWORK_MISMATCH with a method-scoped error", () => {
    const {reject} = callReducer(
      {data: {message: {type: "SIGN_DATA_NETWORK_MISMATCH", error: "bad network"}}},
      "SIGN_DATA"
    );

    expect(reject).toHaveBeenCalledTimes(1);

    const error = reject.mock.calls[0][0] as PeraWalletConnectError;

    expect(error.data.type).toBe("SIGN_DATA_NETWORK_MISMATCH");
    expect(error.message).toBe("bad network");
  });

  it("rejects SIGN_DATA_CALLBACK_ERROR as a cancellation and closes the tab", () => {
    const {reject, close} = callReducer(
      {data: {message: {type: "SIGN_DATA_CALLBACK_ERROR", error: "user cancelled"}}},
      "SIGN_DATA"
    );

    expect(close).toHaveBeenCalled();
    expect(reject).toHaveBeenCalledTimes(1);

    const error = reject.mock.calls[0][0] as PeraWalletConnectError;

    expect(error.data.type).toBe("SIGN_DATA_CANCELLED");
  });

  it("resets storage and rejects on SESSION_DISCONNECTED", () => {
    const {reject, close} = callReducer({
      data: {message: {type: "SESSION_DISCONNECTED", error: "disconnected"}}
    });

    expect(close).toHaveBeenCalled();
    expect(resetWalletDetailsFromStorage).toHaveBeenCalledTimes(1);

    const error = reject.mock.calls[0][0] as PeraWalletConnectError;

    expect(error.data.type).toBe("SESSION_DISCONNECTED");
  });

  it("ignores unrelated message types", () => {
    const {resolve, reject} = callReducer({
      data: {message: {type: "SOME_OTHER_EVENT"}}
    });

    expect(resolve).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
  });
});
