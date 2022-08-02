import algosdk, {Transaction} from "algosdk";

function encodeUnsignedTransactionInBase64(txn: Transaction): string {
  return Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString("base64");
}

function base64ToUint8Array(data: string) {
  return Uint8Array.from(window.atob(data), (value) => value.charCodeAt(0));
}

export {encodeUnsignedTransactionInBase64, base64ToUint8Array};
