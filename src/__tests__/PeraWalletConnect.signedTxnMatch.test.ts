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
