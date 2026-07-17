import {describe, it, expect, vi} from "vitest";

const runWebSignTransactionFlow = vi.fn();

vi.mock("../../util/sign/signTransactionFlow", () => ({
  runWebSignTransactionFlow: (args: any) => {
    runWebSignTransactionFlow(args);
    args.resolve([new Uint8Array([1])]);
  }
}));

// Import AFTER the mock is registered.
const {WebTransport} = await import("../WebTransport");

describe("WebTransport", () => {
  it("signTransaction delegates to runWebSignTransactionFlow with SIGN_TXN", async () => {
    const transport = new WebTransport({
      getWebWalletURL: () => Promise.resolve("https://web.perawallet.app")
    });

    const signed = await transport.signTransaction([{txn: "AA=="}]);

    expect(signed).toHaveLength(1);
    expect(runWebSignTransactionFlow).toHaveBeenCalledWith(
      expect.objectContaining({method: "SIGN_TXN", webWalletURL: "https://web.perawallet.app"})
    );
  });

  it("signArc60Data throws (web is unsupported)", async () => {
    const transport = new WebTransport({
      getWebWalletURL: () => Promise.resolve("https://web.perawallet.app")
    });

    await expect(
      transport.signArc60Data({} as any, {} as any)
    ).rejects.toBeTruthy();
  });
});
