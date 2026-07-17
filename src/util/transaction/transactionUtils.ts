import algosdk, {Transaction} from "algosdk";

import {PeraWalletTransaction, SignerTransaction} from "../model/peraWalletModels";
import {generateSimpleId} from "../number/numberUtils";

function encodeUnsignedTransactionInBase64(txn: Transaction): string {
  return Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64");
}

function base64ToUint8Array(data: string) {
  return Uint8Array.from(window.atob(data), (value) => value.charCodeAt(0));
}

function composeTransaction(transaction: SignerTransaction, signerAddress?: string) {
  let signers: PeraWalletTransaction["signers"];

  if (Array.isArray(transaction.signers)) {
    // The dApp's explicit signers list is authoritative (ARC-0001); an empty
    // array marks the txn as not-to-be-signed by this wallet.
    signers = transaction.signers;
  } else if (signerAddress) {
    // Legacy single-signer mode: when a specific signer is requested, txns
    // without an explicit signers list are marked external (not to be signed).
    signers = [];
  }

  const txnRequestParams: PeraWalletTransaction = {
    txn: encodeUnsignedTransactionInBase64(transaction.txn)
  };

  if (Array.isArray(signers)) {
    txnRequestParams.signers = signers;
  }

  if (transaction.authAddr) {
    txnRequestParams.authAddr = transaction.authAddr;
  }

  if (transaction.message) {
    txnRequestParams.message = transaction.message;
  }

  if (transaction.msig) {
    txnRequestParams.msig = transaction.msig;
  }

  return txnRequestParams;
}

function formatJsonRpcRequest<T>(method: string, params: T) {
  return {
    id: generateSimpleId(),
    jsonrpc: "2.0",
    method,
    params
  };
}

export {
  encodeUnsignedTransactionInBase64,
  base64ToUint8Array,
  composeTransaction,
  formatJsonRpcRequest
};
