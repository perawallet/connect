import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";

import appTellerManager from "../../network/teller/appTellerManager";
import {waitForTabOpening} from "../../dom/domUtils";
import {RunSignTransactionFlowParams} from "../signTransactionFlowModels";
import {runWebSignTransactionFlow} from "../signTransactionFlow";

vi.mock("../../dom/domUtils", () => ({
  waitForTabOpening: vi.fn()
}));

vi.mock("../../network/teller/appTellerManager", () => ({
  default: {sendMessage: vi.fn(), setupListener: vi.fn()}
}));

const waitForTabOpeningMock = vi.mocked(waitForTabOpening);
const sendMessageMock = vi.mocked(appTellerManager.sendMessage);
const setupListenerMock = vi.mocked(appTellerManager.setupListener);

const TXN_PARAMS = [{txn: "encoded-txn"}] as unknown as RunSignTransactionFlowParams["signTxnRequestParams"];

function invoke(overrides: Partial<RunSignTransactionFlowParams> = {}) {
  const resolve = vi.fn();
  const reject = vi.fn();

  runWebSignTransactionFlow({
    method: "SIGN_TXN",
    signTxnRequestParams: TXN_PARAMS,
    webWalletURL: "web.perawallet.app",
    resolve,
    reject,
    ...overrides
  });

  return {resolve, reject};
}

describe("runWebSignTransactionFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("posts a SIGN_TXN message with the transactions", async () => {
    const tab = {closed: false, close: vi.fn()} as unknown as Window;

    waitForTabOpeningMock.mockResolvedValue(tab);

    invoke({method: "SIGN_TXN"});
    await vi.advanceTimersByTimeAsync(0);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock.mock.calls[0][0].message).toMatchObject({
      type: "SIGN_TXN",
      txn: TXN_PARAMS
    });
    expect(setupListenerMock).toHaveBeenCalledTimes(1);
  });

  it("posts a SIGN_DATA message when signer and chainId are provided", async () => {
    const tab = {closed: false, close: vi.fn()} as unknown as Window;

    waitForTabOpeningMock.mockResolvedValue(tab);

    invoke({method: "SIGN_DATA", signer: "ADDR_1", chainId: 416001});
    await vi.advanceTimersByTimeAsync(0);

    expect(sendMessageMock.mock.calls[0][0].message).toMatchObject({
      type: "SIGN_DATA",
      signer: "ADDR_1",
      chainId: 416001
    });
  });

  it("does not post a message for SIGN_DATA without a signer, but still listens", async () => {
    const tab = {closed: false, close: vi.fn()} as unknown as Window;

    waitForTabOpeningMock.mockResolvedValue(tab);

    invoke({method: "SIGN_DATA"});
    await vi.advanceTimersByTimeAsync(0);

    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(setupListenerMock).toHaveBeenCalledTimes(1);
  });

  it("rejects when opening the tab fails", async () => {
    const error = new Error("tab blocked");

    waitForTabOpeningMock.mockRejectedValue(error);

    const {reject} = invoke();

    await vi.advanceTimersByTimeAsync(0);

    expect(reject).toHaveBeenCalledWith(error);
  });
});
