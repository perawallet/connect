import {describe, it, expect, vi, beforeEach} from "vitest";

const runWebSignTransactionFlow = vi.fn();

vi.mock("../../util/sign/signTransactionFlow", () => ({
  runWebSignTransactionFlow: (args: any) => runWebSignTransactionFlow(args)
}));

// Import AFTER the mock is registered.
const {WebTransport} = await import("../WebTransport");

function makeTransport() {
  return new WebTransport({
    getWebWalletURL: () => Promise.resolve("https://web.perawallet.app")
  });
}

describe("WebTransport", () => {
  beforeEach(() => {
    runWebSignTransactionFlow.mockReset();
  });

  it("signTransaction delegates to runWebSignTransactionFlow with SIGN_TXN", async () => {
    runWebSignTransactionFlow.mockImplementation((args) =>
      args.resolve([new Uint8Array([1])])
    );

    const transport = makeTransport();
    const signed = await transport.signTransaction([{txn: "AA=="}]);

    expect(signed).toHaveLength(1);
    expect(runWebSignTransactionFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "SIGN_TXN",
        webWalletURL: "https://web.perawallet.app",
        signTxnRequestParams: [{txn: "AA=="}]
      })
    );
  });

  it("signTransaction rejects when the flow rejects", async () => {
    runWebSignTransactionFlow.mockImplementation((args) =>
      args.reject(new Error("user closed the web wallet"))
    );

    const transport = makeTransport();

    await expect(transport.signTransaction([{txn: "AA=="}])).rejects.toThrow(
      "user closed the web wallet"
    );
  });

  it("signData delegates to runWebSignTransactionFlow with SIGN_DATA and passes signer/chainId", async () => {
    runWebSignTransactionFlow.mockImplementation((args) =>
      args.resolve([new Uint8Array([2])])
    );

    const transport = makeTransport();
    const signed = await transport.signData(
      [{data: new Uint8Array([1]), message: "m"}],
      "SIGNER_ADDRESS",
      // eslint-disable-next-line no-magic-numbers
      4160
    );

    expect(signed).toHaveLength(1);
    expect(runWebSignTransactionFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "SIGN_DATA",
        webWalletURL: "https://web.perawallet.app",
        signer: "SIGNER_ADDRESS",
        // eslint-disable-next-line no-magic-numbers
        chainId: 4160,
        signTxnRequestParams: [{data: new Uint8Array([1]), message: "m"}]
      })
    );
  });

  it("signData rejects when the flow rejects", async () => {
    runWebSignTransactionFlow.mockImplementation((args) =>
      args.reject(new Error("denied"))
    );

    const transport = makeTransport();

    await expect(
      // eslint-disable-next-line no-magic-numbers
      transport.signData([{data: new Uint8Array([1]), message: "m"}], "SIGNER", 4160)
    ).rejects.toThrow("denied");
  });

  it("signArc60Data throws (web is unsupported)", async () => {
    const transport = makeTransport();

    await expect(transport.signArc60Data({} as any, {} as any)).rejects.toThrow(
      /only supported via the Pera mobile wallet or the Pera extension/
    );
  });

  it("does not expose connect/reconnect/disconnect (session lifecycle lives on ExtensionTransport only)", () => {
    const transport = makeTransport();

    expect((transport as any).connect).toBeUndefined();
    expect((transport as any).reconnect).toBeUndefined();
    expect((transport as any).disconnect).toBeUndefined();
  });
});
