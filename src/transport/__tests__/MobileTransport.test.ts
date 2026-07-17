import {describe, it, expect, vi} from "vitest";

import {MobileTransport} from "../MobileTransport";

function makeConnector(response: unknown) {
  return {
    sendCustomRequest: vi.fn().mockResolvedValue(response),
    accounts: ["ADDR"]
  } as any;
}

function makeTransport(connector: any) {
  return new MobileTransport({
    connector,
    shouldShowSignTxnToast: false,
    isInWebview: false,
    getSilent: () => Promise.resolve(true)
  });
}

describe("MobileTransport", () => {
  it("signTransaction decodes base64 responses and drops nulls", async () => {
    const b64 = Buffer.from([4, 5]).toString("base64");
    const transport = makeTransport(makeConnector([b64, null]));

    const signed = await transport.signTransaction([{txn: "AA=="}]);

    expect(signed).toHaveLength(1);
    expect(Array.from(signed[0])).toEqual([4, 5]);
  });

  it("signTransaction decodes number[][] responses", async () => {
    const transport = makeTransport(makeConnector([[7, 8]]));

    const signed = await transport.signTransaction([{txn: "AA=="}]);

    expect(Array.from(signed[0])).toEqual([7, 8]);
  });

  it("throws when the connector is missing", async () => {
    const transport = makeTransport(null);

    await expect(transport.signTransaction([{txn: "AA=="}])).rejects.toBeTruthy();
  });
});
