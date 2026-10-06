import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";

import PeraWalletConnect from "../PeraWalletConnect";
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

const account = algosdk.generateAccount();

function makeTxn(amount: number) {
  return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: account.addr,
    receiver: account.addr,
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

/** `txn` as the wallet returns it for a quantum signer: higher fee, no group yet. */
function withFee(txn: algosdk.Transaction, fee: number) {
  const data = txn.toEncodingData();

  data.set("fee", BigInt(fee));
  data.delete("grp");

  return algosdk.Transaction.fromEncodingData(data);
}

/** A connected instance whose transport answers with `signed`, whatever was asked. */
function peraAnswering(signed: Uint8Array[]) {
  saveWalletDetailsToStorage([String(account.addr)], "pera-wallet-extension");

  const pera = new PeraWalletConnect();

  vi.spyOn(pera as any, "getTransport").mockReturnValue({
    signTransaction: () => Promise.resolve(signed)
  });

  return pera;
}

// Whatever transport answers (a forged Pera Web message, a buggy wallet), the
// dApp must never receive a different transaction as the one it asked for.
describe("PeraWalletConnect.signTransaction response check", () => {
  afterEach(() => {
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("returns the signed transactions when they match the request", async () => {
    const [txn0, txn1, txn2] = algosdk.assignGroupID([
      makeTxn(1),
      makeTxn(2),
      makeTxn(3)
    ]);
    const signed = [txn0.signTxn(account.sk), txn2.signTxn(account.sk)];
    const pera = peraAnswering(signed);

    await expect(
      pera.signTransaction([[{txn: txn0}, {txn: txn1, signers: []}, {txn: txn2}]])
    ).resolves.toEqual(signed);
  });

  // Quantum signers need a higher fee than the dApp estimated. The wallet
  // raises it and regroups, which changes every txID in the group.
  it("accepts a raised fee and the new group ID the wallet assigns", async () => {
    const [txn0, txn1, txn2] = algosdk.assignGroupID([
      makeTxn(1),
      makeTxn(2),
      makeTxn(3)
    ]);
    const [adjusted0, , adjusted2] = algosdk.assignGroupID([
      withFee(txn0, 5000),
      withFee(txn1, 1000),
      withFee(txn2, 3000)
    ]);
    const signed = [adjusted0.signTxn(account.sk), adjusted2.signTxn(account.sk)];
    const pera = peraAnswering(signed);

    await expect(
      pera.signTransaction([[{txn: txn0}, {txn: txn1, signers: []}, {txn: txn2}]])
    ).resolves.toEqual(signed);
  });

  it("accepts a raised fee on an ungrouped transaction", async () => {
    const txn = makeTxn(1);
    const signed = [withFee(txn, 5000).signTxn(account.sk)];

    await expect(peraAnswering(signed).signTransaction([[{txn}]])).resolves.toEqual(
      signed
    );
  });

  it("accepts part of a group whose fees are untouched", async () => {
    const [txn0] = algosdk.assignGroupID([makeTxn(1), makeTxn(2)]);
    const signed = [txn0.signTxn(account.sk)];

    await expect(peraAnswering(signed).signTransaction([[{txn: txn0}]])).resolves.toEqual(
      signed
    );
  });

  // A raised fee lets the group ID change, but only to the one covering the
  // whole original group: atomicity must survive the regroup.
  describe("group ID after a raised fee", () => {
    const [txn0, txn1, txn2] = algosdk.assignGroupID([
      makeTxn(1),
      makeTxn(2),
      makeTxn(3)
    ]);

    it.each([
      [
        "a group split in two",
        () => [
          ...algosdk.assignGroupID([withFee(txn0, 5000), withFee(txn1, 1000)]),
          withFee(txn2, 1000)
        ]
      ],
      [
        "a transaction pulled out of the group",
        () => [
          withFee(txn0, 5000),
          ...algosdk
            .assignGroupID([
              withFee(txn0, 5000),
              withFee(txn1, 1000),
              withFee(txn2, 1000)
            ])
            .slice(1)
        ]
      ],
      [
        "the old group ID kept",
        () => {
          const stale = withFee(txn0, 5000);

          stale.group = txn0.group;

          return [stale, txn1, txn2];
        }
      ]
    ])("rejects %s", async (_, answer) => {
      const pera = peraAnswering(answer().map((txn) => txn.signTxn(account.sk)));

      await expect(
        pera.signTransaction([[{txn: txn0}, {txn: txn1}, {txn: txn2}]])
      ).rejects.toMatchObject({
        data: {type: "SIGN_TRANSACTIONS", detail: {index: 0}}
      });
    });
  });

  it("rejects a group the wallet adds to ungrouped transactions", async () => {
    const txn0 = makeTxn(1);
    const txn1 = makeTxn(2);
    const regrouped = algosdk.assignGroupID([withFee(txn0, 5000), withFee(txn1, 1000)]);
    const pera = peraAnswering(regrouped.map((txn) => txn.signTxn(account.sk)));

    await expect(
      pera.signTransaction([[{txn: txn0}], [{txn: txn1}]])
    ).rejects.toMatchObject({
      data: {type: "SIGN_TRANSACTIONS", detail: {index: 0}}
    });
  });

  it("rejects a fee lower than the one requested", async () => {
    const txn = withFee(makeTxn(1), 2000);
    const pera = peraAnswering([withFee(txn, 1999).signTxn(account.sk)]);

    await expect(pera.signTransaction([[{txn}]])).rejects.toMatchObject({
      data: {type: "SIGN_TRANSACTIONS", detail: {index: 0}}
    });
  });

  it("rejects a raised fee on a transaction that is otherwise different", async () => {
    const pera = peraAnswering([withFee(makeTxn(999), 5000).signTxn(account.sk)]);

    await expect(pera.signTransaction([[{txn: makeTxn(1)}]])).rejects.toMatchObject({
      data: {type: "SIGN_TRANSACTIONS", detail: {index: 0}}
    });
  });

  it("rejects a signed transaction other than the one requested", async () => {
    const pera = peraAnswering([makeTxn(999).signTxn(account.sk)]);

    await expect(pera.signTransaction([[{txn: makeTxn(1)}]])).rejects.toMatchObject({
      data: {type: "SIGN_TRANSACTIONS", detail: {index: 0}}
    });
  });

  it("rejects the right transactions in the wrong order", async () => {
    const [txn0, txn1] = algosdk.assignGroupID([makeTxn(1), makeTxn(2)]);
    const pera = peraAnswering([txn1.signTxn(account.sk), txn0.signTxn(account.sk)]);

    await expect(
      pera.signTransaction([[{txn: txn0}, {txn: txn1}]])
    ).rejects.toMatchObject({
      data: {type: "SIGN_TRANSACTIONS", detail: {index: 0}}
    });
  });

  it("rejects bytes that are not a signed transaction", async () => {
    const pera = peraAnswering([new Uint8Array([1, 2, 3])]);

    await expect(pera.signTransaction([[{txn: makeTxn(1)}]])).rejects.toMatchObject({
      data: {type: "SIGN_TRANSACTIONS", detail: {index: 0, received: undefined}}
    });
  });

  it("rejects a response with the wrong number of transactions", async () => {
    const txn = makeTxn(1);
    const pera = peraAnswering([txn.signTxn(account.sk), txn.signTxn(account.sk)]);

    await expect(pera.signTransaction([[{txn}]])).rejects.toMatchObject({
      data: {type: "SIGN_TRANSACTIONS", detail: {expected: 1, received: 2}}
    });
  });
});
