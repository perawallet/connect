import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";

import {MobileTransport} from "../MobileTransport";
import {ScopeType} from "../../util/model/peraWalletModels";
import {
  PERA_WALLET_REDIRECT_MODAL_ID,
  PERA_WALLET_SIGN_TXN_TOAST_ID
} from "../../modal/peraWalletConnectModalUtils";

const account = algosdk.generateAccount();

function makeConnector(response: unknown) {
  return {
    sendCustomRequest: vi.fn().mockResolvedValue(response),
    accounts: ["ADDR"]
  } as any;
}

function makeTransport(connector: any, overrides: Partial<any> = {}) {
  return new MobileTransport({
    connector,
    shouldShowSignTxnToast: false,
    isInWebview: false,
    getSilent: () => Promise.resolve(true),
    ...overrides
  });
}

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true
  });
}

const DESKTOP_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15";

describe("MobileTransport", () => {
  afterEach(() => {
    setUserAgent(DESKTOP_UA);
    document.body.innerHTML = "";
  });

  describe("constructor side effects", () => {
    it("opens the redirect modal on mobile web outside a webview", () => {
      setUserAgent(IPHONE_UA);

      makeTransport(makeConnector([]), {isInWebview: false});

      expect(document.getElementById(PERA_WALLET_REDIRECT_MODAL_ID)).not.toBeNull();
      expect(document.getElementById(PERA_WALLET_SIGN_TXN_TOAST_ID)).toBeNull();
    });

    it("does not open the redirect modal on mobile inside a webview", () => {
      setUserAgent(IPHONE_UA);

      makeTransport(makeConnector([]), {isInWebview: true});

      expect(document.getElementById(PERA_WALLET_REDIRECT_MODAL_ID)).toBeNull();
    });

    it("opens the sign-txn toast on desktop when requested", () => {
      setUserAgent(DESKTOP_UA);

      makeTransport(makeConnector([]), {shouldShowSignTxnToast: true});

      expect(document.getElementById(PERA_WALLET_SIGN_TXN_TOAST_ID)).not.toBeNull();
      expect(document.getElementById(PERA_WALLET_REDIRECT_MODAL_ID)).toBeNull();
    });

    it("opens nothing on desktop when the toast is not requested", () => {
      setUserAgent(DESKTOP_UA);

      makeTransport(makeConnector([]), {shouldShowSignTxnToast: false});

      expect(document.getElementById(PERA_WALLET_SIGN_TXN_TOAST_ID)).toBeNull();
      expect(document.getElementById(PERA_WALLET_REDIRECT_MODAL_ID)).toBeNull();
    });
  });

  describe("setConnector", () => {
    it("swaps the connector used by subsequent calls", async () => {
      const transport = makeTransport(null);

      await expect(transport.signTransaction([{txn: "AA=="}])).rejects.toBeTruthy();

      const b64 = Buffer.from([1]).toString("base64");

      transport.setConnector(makeConnector([b64]));

      const signed = await transport.signTransaction([{txn: "AA=="}]);

      expect(Array.from(signed[0])).toEqual([1]);
    });
  });

  describe("signTransaction", () => {
    it("decodes base64 responses and drops nulls", async () => {
      const b64 = Buffer.from([4, 5]).toString("base64");
      const transport = makeTransport(makeConnector([b64, null]));

      const signed = await transport.signTransaction([{txn: "AA=="}]);

      expect(signed).toHaveLength(1);
      expect(Array.from(signed[0])).toEqual([4, 5]);
    });

    it("decodes number[][] responses", async () => {
      const transport = makeTransport(makeConnector([[7, 8]]));

      const signed = await transport.signTransaction([{txn: "AA=="}]);

      expect(Array.from(signed[0])).toEqual([7, 8]);
    });

    it("throws when the connector is missing", async () => {
      const transport = makeTransport(null);

      await expect(transport.signTransaction([{txn: "AA=="}])).rejects.toBeTruthy();
    });

    it("wraps a connector rejection in a PeraWalletConnectError", async () => {
      const connector = {
        sendCustomRequest: vi.fn().mockRejectedValue(new Error("user rejected"))
      };
      const transport = makeTransport(connector);

      await expect(transport.signTransaction([{txn: "AA=="}])).rejects.toMatchObject({
        data: {type: "SIGN_TRANSACTIONS"},
        message: "user rejected"
      });
    });
  });

  describe("signData", () => {
    it("base64-encodes the payload and decodes a base64 response", async () => {
      const responseB64 = Buffer.from([1, 2]).toString("base64");
      const connector = makeConnector([responseB64]);
      const transport = makeTransport(connector);

      // eslint-disable-next-line no-magic-numbers
      const signed = await transport.signData(
        [{data: new Uint8Array([9, 9]), message: "hello"}],
        account.addr.toString(),
        4160
      );

      expect(Array.from(signed[0])).toEqual([1, 2]);

      const [, params] = connector.sendCustomRequest.mock.calls[0];
      const [request] = connector.sendCustomRequest.mock.calls[0];

      expect(params).toEqual({forcePushNotification: false});
      expect(request.method).toBe("algo_signData");
      expect(request.params[0].data).toBe(Buffer.from([9, 9]).toString("base64"));
      expect(request.params[0].message).toBe("hello");
      expect(request.params[0].signer).toBe(account.addr.toString());
    });

    it("decodes number[][] responses", async () => {
      const connector = makeConnector([[3, 4]]);
      const transport = makeTransport(connector);

      // eslint-disable-next-line no-magic-numbers
      const signed = await transport.signData(
        [{data: new Uint8Array([1]), message: "m"}],
        account.addr.toString(),
        4160
      );

      expect(Array.from(signed[0])).toEqual([3, 4]);
    });

    it("throws when the connector is missing", async () => {
      const transport = makeTransport(null);

      await expect(
        // eslint-disable-next-line no-magic-numbers
        transport.signData(
          [{data: new Uint8Array([1]), message: "m"}],
          account.addr.toString(),
          4160
        )
      ).rejects.toBeTruthy();
    });

    it("wraps a connector rejection in a PeraWalletConnectError", async () => {
      const connector = {
        sendCustomRequest: vi.fn().mockRejectedValue(new Error("denied"))
      };
      const transport = makeTransport(connector);

      await expect(
        // eslint-disable-next-line no-magic-numbers
        transport.signData(
          [{data: new Uint8Array([1]), message: "m"}],
          account.addr.toString(),
          4160
        )
      ).rejects.toMatchObject({data: {type: "SIGN_TRANSACTIONS"}, message: "denied"});
    });
  });

  describe("signArc60Data", () => {
    function makePayload() {
      return {
        data: Buffer.from(new Uint8Array([1, 2])).toString("base64"),
        signer: algosdk.decodeAddress(account.addr.toString()).publicKey,
        domain: "example.com",
        authenticatorData: new Uint8Array(37)
      };
    }

    it("sends the ARC-60 wire shape and resolves with the raw signer public key", async () => {
      const sigB64 = Buffer.from([9, 9]).toString("base64");
      const connector = makeConnector([sigB64]);
      const transport = makeTransport(connector);

      const response = await transport.signArc60Data(makePayload(), {
        scope: ScopeType.AUTH,
        encoding: "base64"
      });

      const [request] = connector.sendCustomRequest.mock.calls[0];

      expect(request.method).toBe("algo_signData");
      expect(request.params.signer).toBe(account.addr.toString());
      expect(response.signer).toEqual(
        algosdk.decodeAddress(account.addr.toString()).publicKey
      );
      expect(Array.from(response.signature)).toEqual([9, 9]);
    });

    it("throws when the connector is missing", async () => {
      const transport = makeTransport(null);

      await expect(
        transport.signArc60Data(makePayload(), {
          scope: ScopeType.AUTH,
          encoding: "base64"
        })
      ).rejects.toBeTruthy();
    });

    it("re-encodes non-base64 payload data to base64 on the wire", async () => {
      const raw = new Uint8Array([1, 2, 3]);
      const connector = makeConnector([Buffer.from([9]).toString("base64")]);
      const transport = makeTransport(connector);

      await transport.signArc60Data(
        {...makePayload(), data: Buffer.from(raw).toString("hex")},
        {scope: ScopeType.AUTH, encoding: "hex"}
      );

      const [request] = connector.sendCustomRequest.mock.calls[0];

      expect(request.params.data).toBe(Buffer.from(raw).toString("base64"));
    });

    it("decodes a number[] signature response", async () => {
      const connector = makeConnector([[9, 9]]);
      const transport = makeTransport(connector);

      const response = await transport.signArc60Data(makePayload(), {
        scope: ScopeType.AUTH,
        encoding: "base64"
      });

      expect(Array.from(response.signature)).toEqual([9, 9]);
    });

    it("rejects when the wallet returns no signature", async () => {
      const connector = makeConnector([null]);
      const transport = makeTransport(connector);

      await expect(
        transport.signArc60Data(makePayload(), {
          scope: ScopeType.AUTH,
          encoding: "base64"
        })
      ).rejects.toMatchObject({data: {type: "SIGN_TRANSACTIONS"}});
    });
  });
});
