import {Transaction} from "algosdk";

export interface SignerTransaction {
  txn: Transaction;

  /**
   * Optional authorized address used to sign the transaction when
   * the account is rekeyed. Also called the signor/sgnr.
   */
  authAddr?: string;

  /**
   * Optional multisig metadata used to sign the transaction
   */
  msig?: PeraWalletMultisigMetadata;

  /**
   * Optional list of addresses that must sign the transactions.
   * Wallet skips to sign this txn if signers is empty array.
   * If undefined, wallet tries to sign it.
   */
  signers?: string[];

  /**
   * Optional message explaining the reason of the transaction
   */
  message?: string;
}

/**
 * Options for creating and using a multisignature account.
 */
export interface PeraWalletMultisigMetadata {
  /**
   * Multisig version.
   */
  version: number;

  /**
   * Multisig threshold value. Authorization requires a subset of
   * signatures, equal to or greater than the threshold value.
   */
  threshold: number;

  /**
   * List of Algorand addresses of possible signers for this
   * multisig. Order is important.
   */
  addrs: string[];
}

export interface PeraWalletTransaction {
  /**
   * Base64 encoding of the canonical msgpack encoding of a
   * Transaction.
   */
  txn: string;

  /**
   * Optional authorized address used to sign the transaction when
   * the account is rekeyed. Also called the signor/sgnr.
   */
  authAddr?: string;

  /**
   * Optional multisig metadata used to sign the transaction
   */
  msig?: PeraWalletMultisigMetadata;

  /**
   * Optional list of addresses that must sign the transactions
   */
  signers?: string[];

  /**
   * Optional message explaining the reason of the transaction
   */
  message?: string;
}
// Reference: https://github.com/jasonpaulos/algorand-walletconnect-example-dapp/blob/algorand/src/helpers/types.ts

export interface PeraWalletArbitraryData {
  data: Uint8Array;

  /**
   * Required message explaining the reason for the action
   */
  message: string;
}
