import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";

import PeraWalletConnect from "../PeraWalletConnect";
import {SignerTransaction} from "../util/model/peraWalletModels";
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

const walletAccount = algosdk.generateAccount();
const localAccount = algosdk.generateAccount();
const receiver = algosdk.generateAccount();

function makeTxn(from: algosdk.Account, amount: number) {
  return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: from.addr,
    receiver: receiver.addr,
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

function makeConnectedPera() {
  saveWalletDetailsToStorage([String(walletAccount.addr)], "pera-wallet-extension");

  return new PeraWalletConnect();
}

/** Stand-in for the wallet: signs every slot that is not marked `signers: []`. */
function signLikeTheWallet(txGroups: SignerTransaction[][]) {
  return Promise.resolve(
    txGroups
      .flat()
      .filter((slot) => !Array.isArray(slot.signers))
      .map((slot) => slot.txn.signTxn(walletAccount.sk))
  );
}

describe("PeraWalletConnect.transactionSigner", () => {
  afterEach(() => {
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("is a function and returns the same reference on every access", () => {
    const pera = makeConnectedPera();

    expect(typeof pera.transactionSigner).toBe("function");
    expect(pera.transactionSigner).toBe(pera.transactionSigner);
  });

  it("sends the whole group in one signTransaction call, marking unsigned slots with signers: []", async () => {
    const pera = makeConnectedPera();
    const txns = [
      makeTxn(walletAccount, 1),
      makeTxn(localAccount, 2),
      makeTxn(walletAccount, 3)
    ];
    const sig0 = new Uint8Array([0]);
    const sig2 = new Uint8Array([2]);
    const spy = vi.spyOn(pera, "signTransaction").mockResolvedValue([sig0, sig2]);

    const result = await pera.transactionSigner(txns, [0, 2]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith([
      [{txn: txns[0]}, {txn: txns[1], signers: []}, {txn: txns[2]}]
    ]);
    expect(result).toEqual([sig0, sig2]);
  });

  it("returns signatures in indexesToSign order, not group order", async () => {
    const pera = makeConnectedPera();
    const txns = [
      makeTxn(walletAccount, 1),
      makeTxn(localAccount, 2),
      makeTxn(walletAccount, 3)
    ];
    const sigFor0 = new Uint8Array([0]);
    const sigFor2 = new Uint8Array([2]);

    // The wallet returns signed txns in group order (slot 0, then slot 2).
    vi.spyOn(pera, "signTransaction").mockResolvedValue([sigFor0, sigFor2]);

    await expect(pera.transactionSigner(txns, [2, 0])).resolves.toEqual([
      sigFor2,
      sigFor0
    ]);
  });

  it("rejects with SIGN_TRANSACTIONS when the wallet returns a different number of signatures", async () => {
    const pera = makeConnectedPera();
    const txns = [makeTxn(walletAccount, 1), makeTxn(walletAccount, 2)];

    vi.spyOn(pera, "signTransaction").mockResolvedValue([new Uint8Array([0])]);

    await expect(pera.transactionSigner(txns, [0, 1])).rejects.toMatchObject({
      data: {type: "SIGN_TRANSACTIONS", detail: {expected: 2, received: 1}}
    });
  });

  it("rejects before contacting the wallet when an index is outside the group", async () => {
    const pera = makeConnectedPera();
    const spy = vi.spyOn(pera, "signTransaction");

    await expect(
      pera.transactionSigner([makeTxn(walletAccount, 1)], [1])
    ).rejects.toMatchObject({
      data: {type: "SIGN_TRANSACTIONS", detail: {indexesToSign: [1], groupLength: 1}}
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects duplicate indexes before contacting the wallet", async () => {
    const pera = makeConnectedPera();
    const spy = vi.spyOn(pera, "signTransaction");
    const txns = [makeTxn(walletAccount, 1), makeTxn(walletAccount, 2)];

    await expect(pera.transactionSigner(txns, [0, 0])).rejects.toMatchObject({
      data: {type: "SIGN_TRANSACTIONS"}
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("surfaces the not-initialized error when used before a session exists", async () => {
    const pera = new PeraWalletConnect();

    await expect(
      pera.transactionSigner([makeTxn(walletAccount, 1)], [0])
    ).rejects.toThrow("not initialized");
  });

  it("resolves [] without contacting the wallet when there is nothing to sign", async () => {
    const pera = makeConnectedPera();
    const spy = vi.spyOn(pera, "signTransaction");

    await expect(
      pera.transactionSigner([makeTxn(walletAccount, 1)], [])
    ).resolves.toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("drives an AtomicTransactionComposer group with a single wallet prompt", async () => {
    const pera = makeConnectedPera();
    const spy = vi.spyOn(pera, "signTransaction").mockImplementation(signLikeTheWallet);
    const atc = new algosdk.AtomicTransactionComposer();

    // Two Pera-signed slots around one locally-signed slot. ATC batches by
    // signer identity, so a getter returning a fresh function per access
    // would produce two wallet prompts here instead of one.
    atc.addTransaction({txn: makeTxn(walletAccount, 1), signer: pera.transactionSigner});
    atc.addTransaction({
      txn: makeTxn(localAccount, 2),
      signer: algosdk.makeBasicAccountTransactionSigner(localAccount)
    });
    atc.addTransaction({txn: makeTxn(walletAccount, 3), signer: pera.transactionSigner});

    const signed = await atc.gatherSignatures();

    expect(signed).toHaveLength(3);
    expect(spy).toHaveBeenCalledTimes(1);

    const [group] = spy.mock.calls[0][0];

    expect(group.map((slot) => slot.signers)).toEqual([undefined, [], undefined]);
  });
});
