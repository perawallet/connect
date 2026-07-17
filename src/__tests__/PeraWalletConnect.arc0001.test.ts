import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";

import PeraWalletConnect from "../PeraWalletConnect";
import {SignerTransaction, PeraWalletTransaction} from "../util/model/peraWalletModels";
import {
  saveWalletDetailsToStorage,
  resetWalletDetailsFromStorage
} from "../util/storage/storageUtils";

vi.mock("../util/api/peraWalletConnectApi", () => ({
  getPeraConnectConfig: () =>
    Promise.resolve({
      isWebWalletAvailable: false,
      bridgeURL: "https://bridge.test",
      webWalletURL: "https://web.test",
      shouldDisplayNewBadge: false,
      shouldUseSound: false,
      silent: true,
      promoteMobile: false
    })
}));

const accountA = algosdk.generateAccount();
const accountB = algosdk.generateAccount();
const accountC = algosdk.generateAccount();
const rekeyAuth = algosdk.generateAccount();

function makeTxn(from: algosdk.Account, to: algosdk.Account, amount: number) {
  return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: from.addr,
    receiver: to.addr,
    amount,
    suggestedParams: {
      fee: 0,
      minFee: 1000,
      flatFee: false,
      firstValid: 1,
      lastValid: 1001,
      genesisID: "testnet-v1.0",
      genesisHash: new Uint8Array(32)
    }
  });
}

/**
 * Renders `signTransaction`'s outgoing ARC-0001 payload by connecting through
 * the extension platform and capturing what is handed to the transport. The
 * compose step is shared by every platform, so the captured payload is exactly
 * the WalletTransaction[] the wallet receives.
 */
async function captureWalletPayload(
  txGroups: SignerTransaction[][],
  signerAddress?: string
): Promise<PeraWalletTransaction[]> {
  saveWalletDetailsToStorage([String(accountA.addr)], "pera-wallet-extension");

  const pera = new PeraWalletConnect();
  const spy = vi
    .spyOn((pera as any).extensionTransport, "signTransaction")
    .mockResolvedValue([new Uint8Array([1])]);

  await pera.signTransaction(txGroups, signerAddress);

  return spy.mock.calls[0][0] as PeraWalletTransaction[];
}

function decodePayloadTxn(payloadTxn: PeraWalletTransaction) {
  return algosdk.decodeUnsignedTransaction(Buffer.from(payloadTxn.txn, "base64"));
}

describe("ARC-0001 signTransaction payload", () => {
  afterEach(() => {
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("encodes a bare transaction as base64 that round-trips losslessly", async () => {
    const txn = makeTxn(accountA, accountB, 1000);

    const payload = await captureWalletPayload([[{txn}]]);

    expect(payload).toHaveLength(1);
    expect(payload[0]).toEqual({txn: payload[0].txn});
    expect(decodePayloadTxn(payload[0]).txID()).toBe(txn.txID());
  });

  it("preserves the group id assigned by assignGroupID", async () => {
    const txns = [makeTxn(accountA, accountB, 1000), makeTxn(accountB, accountA, 2000)];

    algosdk.assignGroupID(txns);

    const payload = await captureWalletPayload([txns.map((txn) => ({txn}))]);

    const decoded = payload.map(decodePayloadTxn);

    expect(decoded[0].group).toBeDefined();
    expect(decoded[0].group).toEqual(txns[0].group);
    expect(decoded[1].group).toEqual(txns[1].group);
  });

  it("forwards signers: [] so external-signer slots survive to the wallet", async () => {
    // The multi-account scenario from the demo dApp: two wallet-owned slots
    // and one slot signed outside the wallet (e.g. a test account).
    const txns = [
      makeTxn(accountA, accountC, 1000),
      makeTxn(accountB, accountC, 2000),
      makeTxn(accountC, accountA, 3000)
    ];

    algosdk.assignGroupID(txns);

    const payload = await captureWalletPayload([
      [{txn: txns[0]}, {txn: txns[1]}, {txn: txns[2], signers: []}]
    ]);

    expect(payload[0].signers).toBeUndefined();
    expect(payload[1].signers).toBeUndefined();
    expect(payload[2].signers).toEqual([]);
  });

  it("forwards explicit signers lists per slot unchanged", async () => {
    const txns = [makeTxn(accountA, accountB, 1000), makeTxn(accountB, accountA, 2000)];

    algosdk.assignGroupID(txns);

    const payload = await captureWalletPayload([
      [
        {txn: txns[0], signers: [String(accountA.addr)]},
        {txn: txns[1], signers: [String(accountB.addr)]}
      ]
    ]);

    expect(payload[0].signers).toEqual([String(accountA.addr)]);
    expect(payload[1].signers).toEqual([String(accountB.addr)]);
  });

  it("keeps explicit signers authoritative even when a signerAddress is passed", async () => {
    const txns = [makeTxn(accountA, accountB, 1000), makeTxn(accountB, accountA, 2000)];

    algosdk.assignGroupID(txns);

    const payload = await captureWalletPayload(
      [
        [
          {txn: txns[0], signers: [String(accountA.addr)]},
          {txn: txns[1], signers: []}
        ]
      ],
      String(accountA.addr)
    );

    expect(payload[0].signers).toEqual([String(accountA.addr)]);
    expect(payload[1].signers).toEqual([]);
  });

  it("marks slots without explicit signers as external in legacy single-signer mode", async () => {
    const txns = [makeTxn(accountA, accountB, 1000), makeTxn(accountB, accountA, 2000)];

    algosdk.assignGroupID(txns);

    const payload = await captureWalletPayload(
      [[{txn: txns[0]}, {txn: txns[1]}]],
      String(accountA.addr)
    );

    expect(payload[0].signers).toEqual([]);
    expect(payload[1].signers).toEqual([]);
  });

  it("flattens multiple atomic groups into one payload in order", async () => {
    const group1 = [makeTxn(accountA, accountB, 1000), makeTxn(accountB, accountA, 2000)];
    const group2 = [makeTxn(accountA, accountC, 3000)];

    algosdk.assignGroupID(group1);

    const payload = await captureWalletPayload([
      group1.map((txn) => ({txn})),
      [{txn: group2[0], signers: []}]
    ]);

    expect(payload).toHaveLength(3);
    expect(decodePayloadTxn(payload[0]).txID()).toBe(group1[0].txID());
    expect(decodePayloadTxn(payload[1]).txID()).toBe(group1[1].txID());
    expect(decodePayloadTxn(payload[2]).txID()).toBe(group2[0].txID());
    expect(payload[2].signers).toEqual([]);
  });

  it("forwards authAddr for rekeyed accounts", async () => {
    const txn = makeTxn(accountA, accountB, 1000);

    const payload = await captureWalletPayload([
      [{txn, authAddr: String(rekeyAuth.addr)}]
    ]);

    expect(payload[0].authAddr).toBe(String(rekeyAuth.addr));
  });

  it("forwards msig metadata and message annotations", async () => {
    const msig = {
      version: 1,
      threshold: 2,
      addrs: [String(accountA.addr), String(accountB.addr), String(accountC.addr)]
    };
    const txn = makeTxn(accountA, accountB, 1000);

    const payload = await captureWalletPayload([
      [{txn, msig, message: "multisig spend", signers: [String(accountA.addr)]}]
    ]);

    expect(payload[0].msig).toEqual(msig);
    expect(payload[0].message).toBe("multisig spend");
    expect(payload[0].signers).toEqual([String(accountA.addr)]);
  });

  it("omits every optional field that the dApp did not provide", async () => {
    const payload = await captureWalletPayload([[{txn: makeTxn(accountA, accountB, 1)}]]);

    expect(Object.keys(payload[0])).toEqual(["txn"]);
  });
});
