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

/**
 * ARC-60 scope types. Names and values match @txnlab/use-wallet's `ScopeType`
 * so that dapps can share code between pera-connect and use-wallet adapters.
 */
export enum ScopeType {
  UNKNOWN = -1,
  AUTH = 1
}

/**
 * ARC-60 signing metadata. Shape matches @txnlab/use-wallet's `SignMetadata`.
 * Currently only `scope: ScopeType.AUTH` and `encoding: "base64"` are
 * supported by the Pera mobile wallet.
 */
export interface SignMetadata {
  scope: ScopeType;
  encoding: string;
}

/**
 * Canonical Sign-In With Algorand payload (ARC-60 scope = AUTH).
 * Field names match the SIWA spec and @txnlab/use-wallet's `Siwa` interface.
 * The object must be serialized as RFC 8785 canonical JSON before being
 * passed to the wallet.
 *
 * Spec: https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0060.md
 */
export interface Siwa {
  domain: string;
  account_address: string;
  uri: string;
  version: string;
  /** SLIP-0044 coin type for Algorand. */
  chain_id: "283";
  type: "ed25519";
  statement?: string;
  nonce?: string;
  "issued-at"?: string;
  "expiration-time"?: string;
  "not-before"?: string;
  "request-id"?: string;
  resources?: string[];
}

/**
 * ARC-60 `signData` payload as consumed by `PeraWalletConnect.signArc60Data`.
 * Sent to the wallet as a single object (not an array) so the mobile app
 * routes it to the ARC-60 auth flow rather than the generic arbitrary-data
 * flow.
 */
export interface PeraWalletArc60SignData {
  /**
   * Payload bytes to be signed (typically the UTF-8 bytes of canonical SIWA
   * JSON). Will be base64-encoded on the wire.
   */
  data: Uint8Array;

  /**
   * Algorand address that should sign the payload.
   */
  signer: string;

  /**
   * Origin/domain requesting the signature.
   */
  domain: string;

  /**
   * FIDO-style authenticator data. First 32 bytes must equal sha256(domain).
   * Will be base64-encoded on the wire.
   */
  authenticatorData: Uint8Array;

  /**
   * Optional request ID for replay protection.
   */
  requestId?: string;

  /**
   * Optional BIP44 derivation path.
   */
  hdPath?: string;

  metadata: SignMetadata;
}
