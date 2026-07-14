import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";

import appTellerManager from "../../network/teller/appTellerManager";
import {waitForTabOpening} from "../../dom/domUtils";
import {removeModalWrapperFromDOM} from "../../../modal/peraWalletConnectModalUtils";
import {runWebConnectFlow} from "../connectFlow";

vi.mock("../../dom/domUtils", () => ({
  waitForTabOpening: vi.fn(),
  getMetaInfo: vi.fn(() => ({
    title: "dApp",
    description: "desc",
    url: "https://dapp.example.com",
    favicon: "https://dapp.example.com/favicon.ico"
  }))
}));

vi.mock("../../network/teller/appTellerManager", () => ({
  default: {sendMessage: vi.fn(), setupListener: vi.fn()}
}));

vi.mock("../../../modal/peraWalletConnectModalUtils", () => ({
  PERA_WALLET_CONNECT_MODAL_ID: "pera-wallet-connect-modal",
  removeModalWrapperFromDOM: vi.fn()
}));

const waitForTabOpeningMock = vi.mocked(waitForTabOpening);
const sendMessageMock = vi.mocked(appTellerManager.sendMessage);
const setupListenerMock = vi.mocked(appTellerManager.setupListener);
const removeModalMock = vi.mocked(removeModalWrapperFromDOM);

function invoke(overrides: Partial<Parameters<typeof runWebConnectFlow>[0]> = {}) {
  const resolve = vi.fn();
  const reject = vi.fn();

  const run = runWebConnectFlow({
    webWalletURL: "web.perawallet.app",
    chainId: 416001,
    resolve,
    reject,
    ...overrides
  });

  return {run, resolve, reject};
}

describe("runWebConnectFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("opens the connect tab, posts a CONNECT message, and wires the listener", async () => {
    const tab = {closed: false, close: vi.fn()} as unknown as Window;

    waitForTabOpeningMock.mockResolvedValue(tab);

    const {run} = invoke();

    await run();

    expect(sendMessageMock).toHaveBeenCalledTimes(1);

    const sent = sendMessageMock.mock.calls[0][0];

    expect(sent.message).toMatchObject({type: "CONNECT", data: {chainId: 416001}});
    expect(sent.targetWindow).toBe(tab);
    expect(setupListenerMock).toHaveBeenCalledTimes(1);
  });

  it("still sets up the listener when no tab is returned", async () => {
    waitForTabOpeningMock.mockResolvedValue(null);

    const {run} = invoke();

    await run();

    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(setupListenerMock).toHaveBeenCalledTimes(1);
  });

  it("tears down the modal and rejects when opening the tab fails", async () => {
    const error = new Error("tab blocked");

    waitForTabOpeningMock.mockRejectedValue(error);

    const {run, reject} = invoke();

    await run();

    expect(removeModalMock).toHaveBeenCalledWith("pera-wallet-connect-modal");
    expect(reject).toHaveBeenCalledWith(error);
  });
});
