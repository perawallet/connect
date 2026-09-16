import {describe, it, expect, vi, beforeEach} from "vitest";
import algosdk from "algosdk";

import {ExtensionTransport} from "../ExtensionTransport";
import {PERA_PROVIDER_ERROR_CODES, PeraProvider} from "../peraProviderTypes";
import {ScopeType} from "../../../util/model/peraWalletModels";

const account = algosdk.generateAccount();
const ADDRESS = account.addr.toString();

function providerError(code: number, message = "provider error") {
  const error = new Error(message) as Error & {code: number};

  error.name = "PeraProviderError";
  error.code = code;

  return error;
}

type StubProvider = PeraProvider & {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  getAddresses: ReturnType<typeof vi.fn>;
  signTransactions: ReturnType<typeof vi.fn>;
  signData: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  emit: (event: string, params?: unknown) => void;
};

function makeProvider(): StubProvider {
  const handlers: Record<string, ((params: unknown) => void)[]> = {};

  return {
    version: "1",
    connect: vi.fn().mockResolvedValue({
      accounts: [{address: ADDRESS, name: "Main"}],
      network: "testnet"
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getAddresses: vi.fn().mockResolvedValue([]),
    signTransactions: vi.fn(),
    signData: vi.fn(),
    on: vi.fn((event: string, handler: (params: unknown) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);

      return () => {
        handlers[event] = handlers[event].filter((item) => item !== handler);
      };
    }),
    emit: (event: string, params?: unknown) => {
      (handlers[event] || []).forEach((handler) => handler(params));
    }
  } as StubProvider;
}

describe("ExtensionTransport signing", () => {
  let provider: StubProvider;

  beforeEach(() => {
    provider = makeProvider();
  });

  describe("signTransaction()", () => {
    const txns = [
      {txn: "AA==", signers: [ADDRESS], authAddr: ADDRESS},
      {txn: "AQ==", signers: []},
      {txn: "Ag=="}
    ];

    it("sends the ARC-0001 array through and rebuilds Uint8Array[] skipping nulls", async () => {
      provider.signTransactions.mockResolvedValue([
        Buffer.from([1, 2, 3]).toString("base64"),
        null,
        Buffer.from([9]).toString("base64")
      ]);
      const transport = new ExtensionTransport(provider, {});

      const signed = await transport.signTransaction(txns);

      expect(provider.signTransactions).toHaveBeenCalledWith(txns);
      expect(signed).toHaveLength(2);
      expect(Array.from(signed[0])).toEqual([1, 2, 3]);
      expect(Array.from(signed[1])).toEqual([9]);
    });

    it("maps user rejection to SIGN_TXN_CANCELLED", async () => {
      provider.signTransactions.mockRejectedValue(
        providerError(PERA_PROVIDER_ERROR_CODES.USER_REJECTED)
      );
      const transport = new ExtensionTransport(provider, {});

      await expect(transport.signTransaction(txns)).rejects.toMatchObject({
        data: {type: "SIGN_TXN_CANCELLED"}
      });
    });

    it("maps a network mismatch to SIGN_TXN_NETWORK_MISMATCH", async () => {
      provider.signTransactions.mockRejectedValue(
        providerError(PERA_PROVIDER_ERROR_CODES.NETWORK_NOT_SUPPORTED)
      );
      const transport = new ExtensionTransport(provider, {});

      await expect(transport.signTransaction(txns)).rejects.toMatchObject({
        data: {type: "SIGN_TXN_NETWORK_MISMATCH"}
      });
    });

    it("maps a lost connection to SESSION_DISCONNECTED", async () => {
      provider.signTransactions.mockRejectedValue(
        providerError(PERA_PROVIDER_ERROR_CODES.UNAUTHORIZED)
      );
      const transport = new ExtensionTransport(provider, {});

      await expect(transport.signTransaction(txns)).rejects.toMatchObject({
        data: {type: "SESSION_DISCONNECTED"}
      });
    });

    it("wraps unknown failures as SIGN_TRANSACTIONS with the cause attached", async () => {
      const cause = new Error("boom");

      provider.signTransactions.mockRejectedValue(cause);
      const transport = new ExtensionTransport(provider, {});

      await expect(transport.signTransaction(txns)).rejects.toMatchObject({
        data: {type: "SIGN_TRANSACTIONS", detail: cause},
        message: "boom"
      });
    });
  });

  describe("signData()", () => {
    it("sends the legacy arbitrary-data shape and decodes base64 signatures", async () => {
      const sig = Buffer.from([7, 7]).toString("base64");

      provider.signData.mockResolvedValue([sig]);
      const transport = new ExtensionTransport(provider, {});

      const result = await transport.signData(
        [{data: new Uint8Array([1, 2]), message: "hello"}],
        ADDRESS,
        4160
      );

      expect(provider.signData).toHaveBeenCalledWith({
        data: [
          {
            signer: ADDRESS,
            data: Buffer.from([1, 2]).toString("base64"),
            message: "hello"
          }
        ]
      });
      expect(Array.from(result[0])).toEqual([7, 7]);
    });

    it("maps user rejection to SIGN_DATA_CANCELLED", async () => {
      provider.signData.mockRejectedValue(
        providerError(PERA_PROVIDER_ERROR_CODES.USER_REJECTED)
      );
      const transport = new ExtensionTransport(provider, {});

      await expect(
        transport.signData([{data: new Uint8Array([1]), message: "m"}], ADDRESS, 4160)
      ).rejects.toMatchObject({data: {type: "SIGN_DATA_CANCELLED"}});
    });
  });

  describe("signArc60Data()", () => {
    const metadata = {scope: ScopeType.AUTH, encoding: "base64"};
    const signer = algosdk.decodeAddress(ADDRESS).publicKey;

    it("sends the ARC-60 wire object (base64 authenticatorData, address signer) and returns the response shape", async () => {
      provider.signData.mockResolvedValue([Buffer.from([9, 9]).toString("base64")]);
      const transport = new ExtensionTransport(provider, {});
      const payload = {
        data: Buffer.from([1, 2]).toString("base64"),
        signer,
        domain: window.location.origin,
        authenticatorData: new Uint8Array(37)
      };

      const response = await transport.signArc60Data(payload, metadata);

      const wire = provider.signData.mock.calls[0][0];

      expect(wire.signer).toBe(ADDRESS);
      expect(wire.authenticatorData).toBe(
        Buffer.from(new Uint8Array(37)).toString("base64")
      );
      expect(wire.metadata).toEqual({scope: ScopeType.AUTH, encoding: "base64"});
      expect(response.signer).toEqual(signer);
      expect(Array.from(response.signature)).toEqual([9, 9]);
    });

    it("rejects with SIGN_DATA when the wallet returns no signature", async () => {
      provider.signData.mockResolvedValue([]);
      const transport = new ExtensionTransport(provider, {});

      await expect(
        transport.signArc60Data(
          {
            data: "AA==",
            signer,
            domain: window.location.origin,
            authenticatorData: new Uint8Array(37)
          },
          metadata
        )
      ).rejects.toMatchObject({data: {type: "SIGN_DATA"}});
    });

    it("maps a network mismatch to SIGN_DATA_NETWORK_MISMATCH", async () => {
      provider.signData.mockRejectedValue(
        providerError(PERA_PROVIDER_ERROR_CODES.NETWORK_NOT_SUPPORTED)
      );
      const transport = new ExtensionTransport(provider, {});

      await expect(
        transport.signArc60Data(
          {
            data: "AA==",
            signer,
            domain: window.location.origin,
            authenticatorData: new Uint8Array(37)
          },
          metadata
        )
      ).rejects.toMatchObject({data: {type: "SIGN_DATA_NETWORK_MISMATCH"}});
    });
  });
});
