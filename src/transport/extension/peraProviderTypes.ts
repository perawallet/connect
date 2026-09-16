/**
 * The provider the Pera browser extension installs at `window.pera` on every
 * https page (and `http://localhost`), before any page script runs. It is
 * frozen and lives in the top frame only, never in iframes.
 *
 * Detection is synchronous: `typeof window.pera === "object" &&
 * window.pera.version === "1"`. There is no ready event to wait for.
 */
export type PeraAccount = {address: string; name: string};

export type PeraNetwork = "mainnet" | "testnet" | "betanet";

export interface PeraProviderConnectOptions {
  /** dApp display name, at most 100 characters. */
  name?: string;
  /** At most 300 characters. */
  description?: string;
  /** https only and same origin as the page; anything else is dropped by the wallet. */
  icons?: string[];
  /**
   * When given and the wallet is on a different network, `connect()` rejects
   * with `PERA_PROVIDER_ERROR_CODES.NETWORK_NOT_SUPPORTED`.
   */
  network?: PeraNetwork;
}

export interface PeraProviderConnectResult {
  accounts: PeraAccount[];
  network: PeraNetwork;
}

/** ARC-0001 `WalletTransaction`; `txn` is the base64 unsigned transaction. */
export interface PeraProviderWalletTransaction {
  txn: string;
  signers?: string[];
  authAddr?: string;
  msig?: unknown;
  stxn?: string;
  message?: string;
}

export type PeraProviderEvent = "accountsChanged" | "networkChanged" | "disconnect";

export interface PeraProvider {
  readonly version: "1";
  /**
   * Needs transient user activation for a first-time connect: call it directly
   * inside a click handler. When the origin already has an approved connection
   * it resolves immediately with the stored accounts and needs no gesture.
   */
  connect(options?: PeraProviderConnectOptions): Promise<PeraProviderConnectResult>;
  disconnect(): Promise<void>;
  getAddresses(): Promise<PeraAccount[]>;
  /**
   * One base64 signed transaction per entry, in order; `null` where the entry
   * had `signers: []` and was therefore not signed by the wallet.
   */
  signTransactions(
    txns: PeraProviderWalletTransaction[],
    opts?: {message?: string}
  ): Promise<(string | null)[]>;
  /** Returns one base64 signature per entry. */
  signData(payload: unknown): Promise<string[]>;
  /** Returns the unsubscribe function. */
  on(event: PeraProviderEvent, handler: (params: unknown) => void): () => void;
}

/**
 * Every rejection from the provider is an `Error` with this name and a
 * numeric `code` from `PERA_PROVIDER_ERROR_CODES`.
 */
export interface PeraProviderError extends Error {
  name: "PeraProviderError";
  code: number;
}

export const PERA_PROVIDER_ERROR_CODES = {
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  /** Not connected, `connect()` without a user gesture, or untrusted origin. */
  UNAUTHORIZED: -32001,
  USER_REJECTED: -32002,
  NETWORK_NOT_SUPPORTED: -32003,
  /** The wallet did not answer within its own TTL (about 5 minutes). */
  TIMED_OUT: -32004
} as const;

declare global {
  interface Window {
    pera?: PeraProvider;
  }
}

export function isPeraProviderError(error: unknown): error is PeraProviderError {
  return (
    error instanceof Error &&
    error.name === "PeraProviderError" &&
    typeof (error as {code?: unknown}).code === "number"
  );
}

/**
 * Synchronous feature detection of the extension's provider. Never polls and
 * never waits: the provider is either there before the page's scripts run or
 * not at all.
 */
export function getPeraProvider(): PeraProvider | null {
  if (typeof window === "undefined") {
    return null;
  }

  const provider = window.pera;

  if (typeof provider === "object" && provider !== null && provider.version === "1") {
    return provider;
  }

  return null;
}
