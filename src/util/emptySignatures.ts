import PeraWalletConnectError from "./PeraWalletConnectError";
import {AlgorandChainIDs} from "./peraWalletTypes";
import {
  BETANET_NODE_CHAIN_ID,
  MAINNET_NODE_CHAIN_ID,
  TESTNET_NODE_CHAIN_ID
} from "./algod/algodConstants";
import {PeraNetwork} from "../transport/extension/peraProviderTypes";

/** The WalletConnect method use-wallet defines for empty signatures (TxnLab/use-wallet#465). */
export const EMPTY_SIGNATURES_METHOD = "algo_getEmptySignatures";

/** Matches use-wallet. Pera apps without the method drop it silently, so this is the only exit. */
export const EMPTY_SIGNATURES_TIMEOUT_MS = 30_000;

/** `algorand:` plus the first 32 characters of the base64url genesis hash, as use-wallet sends them. */
export const EMPTY_SIGNATURES_CAIP2_CHAIN_IDS: Record<PeraNetwork, string> = {
  mainnet: "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k",
  testnet: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe",
  betanet: "algorand:mFgazF-2uRS1tMiL9dsj01hJGySEmPN2"
};

// use-wallet decodes empty signatures with `atob`, which rejects base64url and
// would quietly leave the account unknown, so such values are dropped here.
const STANDARD_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Plain-JS callers bypass the type, so the value is checked at runtime. */
export function assertEmptySignaturesNetwork(
  network: unknown
): asserts network is PeraNetwork | undefined {
  if (
    network !== undefined &&
    network !== "mainnet" &&
    network !== "testnet" &&
    network !== "betanet"
  ) {
    throw new PeraWalletConnectError(
      {type: "EMPTY_SIGNATURES_NETWORK_UNSUPPORTED", detail: network},
      `Unsupported network "${String(network)}": use "mainnet", "testnet" or "betanet".`
    );
  }
}

/**
 * The network to ask about: the argument if given, otherwise the one the
 * `chainId` option pins. A WalletConnect v1 session's chainId only echoes what
 * the dApp asked for, so an all-networks session (`4160`, the default) can't
 * tell which network the wallet is on.
 */
export function resolveEmptySignaturesNetwork(
  network: PeraNetwork | undefined,
  chainId: AlgorandChainIDs | undefined
): PeraNetwork {
  assertEmptySignaturesNetwork(network);

  if (network) {
    return network;
  }

  if (chainId === MAINNET_NODE_CHAIN_ID) {
    return "mainnet";
  }

  if (chainId === TESTNET_NODE_CHAIN_ID) {
    return "testnet";
  }

  if (chainId === BETANET_NODE_CHAIN_ID) {
    return "betanet";
  }

  throw new PeraWalletConnectError(
    {type: "EMPTY_SIGNATURES_NETWORK_REQUIRED"},
    "Pass a network: this session allows any network (chainId 4160), so connect can't tell which one the wallet is on."
  );
}

/**
 * Keeps the wallet's answer for the session's own accounts, where the value is
 * standard base64. Anything else is left out, which use-wallet treats as unknown.
 */
export function filterEmptySignatures(
  result: unknown,
  accounts: readonly string[]
): Record<string, string> {
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    throw new PeraWalletConnectError(
      {type: "EMPTY_SIGNATURES", detail: {reason: "invalid-result", result}},
      `Pera's answer to ${EMPTY_SIGNATURES_METHOD} is not an object.`
    );
  }

  const emptySignatures: Record<string, string> = {};

  for (const address of accounts) {
    const value = Object.prototype.hasOwnProperty.call(result, address)
      ? (result as Record<string, unknown>)[address]
      : undefined;

    if (typeof value === "string" && STANDARD_BASE64.test(value)) {
      emptySignatures[address] = value;
    }
  }

  return emptySignatures;
}

/** Rejects with `onTimeout()` after `ms`, and always clears its timer. */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: () => Error
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(onTimeout()), ms);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
