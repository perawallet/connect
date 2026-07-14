import {describe, it, expect, vi, beforeEach} from "vitest";

import PeraWalletConnectError from "../../PeraWalletConnectError";
import {newTabConnectFlowTellerReducer} from "../connectFlowReducers";
import {NewTabConnectFlowTellerReducerParams} from "../connectFlowModels";

const saveWalletDetailsToStorage = vi.fn();
const removeModalWrapperFromDOM = vi.fn();

vi.mock("../../storage/storageUtils", () => ({
  saveWalletDetailsToStorage: (...args: unknown[]) =>
    saveWalletDetailsToStorage(...args)
}));

vi.mock("../../../modal/peraWalletConnectModalUtils", () => ({
  PERA_WALLET_CONNECT_MODAL_ID: "pera-wallet-connect-modal",
  removeModalWrapperFromDOM: (...args: unknown[]) => removeModalWrapperFromDOM(...args)
}));

type ReducerArgs = Omit<NewTabConnectFlowTellerReducerParams, "event"> & {
  event: any;
};

function callReducer(overrides: Partial<ReducerArgs>) {
  const close = vi.fn();
  const resolve = vi.fn();
  const reject = vi.fn();

  newTabConnectFlowTellerReducer({
    resolve,
    reject,
    newPeraWalletTab: {close} as unknown as Window,
    ...overrides
  } as NewTabConnectFlowTellerReducerParams);

  return {close, resolve, reject};
}

describe("newTabConnectFlowTellerReducer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CONNECT_CALLBACK", () => {
    const event = {
      data: {message: {type: "CONNECT_CALLBACK", data: {addresses: ["ADDR_1"]}}}
    };

    it("resolves with the returned addresses", () => {
      const {resolve} = callReducer({event});

      expect(resolve).toHaveBeenCalledWith(["ADDR_1"]);
    });

    it("persists the accounts as a pera-wallet-web session", () => {
      callReducer({event});

      expect(saveWalletDetailsToStorage).toHaveBeenCalledWith(
        ["ADDR_1"],
        "pera-wallet-web"
      );
    });

    it("tears down the modal and closes the wallet tab", () => {
      const {close} = callReducer({event});

      expect(removeModalWrapperFromDOM).toHaveBeenCalledWith("pera-wallet-connect-modal");
      expect(close).toHaveBeenCalled();
    });

    it("does nothing when resolve is not provided", () => {
      newTabConnectFlowTellerReducer({
        event,
        resolve: undefined as any,
        reject: vi.fn(),
        newPeraWalletTab: null
      } as unknown as NewTabConnectFlowTellerReducerParams);

      expect(saveWalletDetailsToStorage).not.toHaveBeenCalled();
    });
  });

  describe("CONNECT_NETWORK_MISMATCH", () => {
    const event = {
      data: {message: {type: "CONNECT_NETWORK_MISMATCH", error: "wrong network"}}
    };

    it("rejects with a CONNECT_NETWORK_MISMATCH error", () => {
      const {reject} = callReducer({event});

      expect(reject).toHaveBeenCalledTimes(1);

      const error = reject.mock.calls[0][0] as PeraWalletConnectError;

      expect(error).toBeInstanceOf(PeraWalletConnectError);
      expect(error.data.type).toBe("CONNECT_NETWORK_MISMATCH");
      expect(error.message).toBe("wrong network");
    });

    it("tears down the modal and closes the tab", () => {
      const {close, resolve} = callReducer({event});

      expect(resolve).not.toHaveBeenCalled();
      expect(removeModalWrapperFromDOM).toHaveBeenCalledWith("pera-wallet-connect-modal");
      expect(close).toHaveBeenCalled();
    });
  });
});
