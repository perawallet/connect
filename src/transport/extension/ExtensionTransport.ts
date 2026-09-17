import {WalletTransport, ConnectOptions} from "../WalletTransport";
import {buildArc60WireParams, buildArc60SignDataResponse} from "../arc60Wire";
import {
  PeraNetwork,
  PeraProvider,
  PeraProviderConnectOptions,
  PERA_PROVIDER_ERROR_CODES,
  isPeraProviderError
} from "./peraProviderTypes";
import PeraWalletConnectError from "../../util/PeraWalletConnectError";
import {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  SignMetadata,
  PeraWalletTransaction
} from "../../util/model/peraWalletModels";
import {AlgorandChainIDs} from "../../util/peraWalletTypes";
import {
  BETANET_NODE_CHAIN_ID,
  MAINNET_NODE_CHAIN_ID,
  TESTNET_NODE_CHAIN_ID
} from "../../util/algod/algodConstants";
import {base64ToUint8Array} from "../../util/transaction/transactionUtils";
import {getMetaInfo} from "../../util/dom/domUtils";
import {
  saveWalletDetailsToStorage,
  resetWalletDetailsFromStorage,
  getWalletPlatformFromStorage
} from "../../util/storage/storageUtils";

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 300;

type ErrorContext = "connect" | "reconnect" | "sign-txn" | "sign-data";
type ErrorType = PeraWalletConnectError["data"]["type"];

const CANCELLED_TYPES: Record<ErrorContext, ErrorType> = {
  connect: "CONNECT_CANCELLED",
  reconnect: "SESSION_RECONNECT",
  "sign-txn": "SIGN_TXN_CANCELLED",
  "sign-data": "SIGN_DATA_CANCELLED"
};

const NETWORK_MISMATCH_TYPES: Record<ErrorContext, ErrorType> = {
  connect: "CONNECT_NETWORK_MISMATCH",
  reconnect: "CONNECT_NETWORK_MISMATCH",
  "sign-txn": "SIGN_TXN_NETWORK_MISMATCH",
  "sign-data": "SIGN_DATA_NETWORK_MISMATCH"
};

const UNAUTHORIZED_TYPES: Record<ErrorContext, ErrorType> = {
  connect: "SESSION_CONNECT",
  reconnect: "SESSION_RECONNECT",
  "sign-txn": "SESSION_DISCONNECTED",
  "sign-data": "SESSION_DISCONNECTED"
};

const FALLBACK_TYPES: Record<ErrorContext, ErrorType> = {
  connect: "SESSION_CONNECT",
  reconnect: "SESSION_RECONNECT",
  "sign-txn": "SIGN_TRANSACTIONS",
  "sign-data": "SIGN_DATA"
};

const FALLBACK_MESSAGES: Record<ErrorContext, string> = {
  connect: "There was an error while connecting to the Pera extension",
  reconnect: "There was an error while reconnecting to the Pera extension",
  "sign-txn": "Failed to sign transaction",
  "sign-data": "Failed to sign data"
};

/**
 * Maps a `window.pera` rejection onto the SDK's error classes. Anything that
 * is not a `PeraProviderError` is wrapped as the context's generic failure with
 * the original error attached as `detail`.
 */
function mapProviderError(error: unknown, context: ErrorContext): PeraWalletConnectError {
  const message = (error as Error)?.message || FALLBACK_MESSAGES[context];

  if (isPeraProviderError(error)) {
    switch (error.code) {
      case PERA_PROVIDER_ERROR_CODES.USER_REJECTED:
        return new PeraWalletConnectError({type: CANCELLED_TYPES[context]}, message);
      case PERA_PROVIDER_ERROR_CODES.NETWORK_NOT_SUPPORTED:
        return new PeraWalletConnectError(
          {type: NETWORK_MISMATCH_TYPES[context], detail: error},
          message
        );
      case PERA_PROVIDER_ERROR_CODES.UNAUTHORIZED:
        return new PeraWalletConnectError(
          {type: UNAUTHORIZED_TYPES[context], detail: error},
          context === "connect"
            ? `${message}. connect() must be called from a user gesture (for example a click handler).`
            : message
        );
      case PERA_PROVIDER_ERROR_CODES.TIMED_OUT:
        return new PeraWalletConnectError(
          {type: "MESSAGE_NOT_RECEIVED", detail: error},
          message
        );
      default:
        break;
    }
  }

  return new PeraWalletConnectError(
    {type: FALLBACK_TYPES[context], detail: error},
    message
  );
}

/**
 * The `network` option for `window.pera.connect()`: set when the session is
 * pinned to one network, omitted for the all-networks `4160` (or unset) so the
 * wallet connects on whatever network it is on.
 */
function getPeraNetworkFromChainId(chainId?: AlgorandChainIDs): PeraNetwork | undefined {
  switch (chainId) {
    case MAINNET_NODE_CHAIN_ID:
      return "mainnet";
    case TESTNET_NODE_CHAIN_ID:
      return "testnet";
    case BETANET_NODE_CHAIN_ID:
      return "betanet";
    default:
      return undefined;
  }
}

function buildProviderConnectOptions(
  chainId?: AlgorandChainIDs
): PeraProviderConnectOptions {
  const {title, description, favicon} = getMetaInfo();
  const options: PeraProviderConnectOptions = {};

  if (title) {
    options.name = title.slice(0, MAX_NAME_LENGTH);
  }

  if (description) {
    options.description = description.slice(0, MAX_DESCRIPTION_LENGTH);
  }

  if (favicon) {
    options.icons = [favicon];
  }

  const network = getPeraNetworkFromChainId(chainId);

  if (network) {
    options.network = network;
  }

  return options;
}

export interface ExtensionTransportDeps {
  chainId?: AlgorandChainIDs;
  /** The wallet revoked this origin from its Connections screen. */
  onDisconnect?: () => void;
  onNetworkChanged?: (params: {network: PeraNetwork}) => void;
}

/**
 * Routes connect / reconnect / sign / disconnect through the provider the Pera
 * browser extension injects at `window.pera`. The wallet keys the connection
 * on the page origin, so the only state kept here is the stored wallet details
 * that mark the extension as the last successful transport.
 */
export class ExtensionTransport implements WalletTransport {
  readonly platform = "extension" as const;
  private provider: PeraProvider;
  private deps: ExtensionTransportDeps;
  private unsubscribers: (() => void)[] = [];
  private _network: PeraNetwork | null = null;

  constructor(provider: PeraProvider, deps: ExtensionTransportDeps = {}) {
    this.provider = provider;
    this.deps = deps;

    this.unsubscribers.push(
      provider.on("disconnect", () => this.handleProviderDisconnect()),
      provider.on("networkChanged", (params) => this.handleProviderNetworkChanged(params))
    );
  }

  /** The wallet's active network as of the last connect or `networkChanged`. */
  get network(): PeraNetwork | null {
    return this._network;
  }

  /** Stops listening to the provider's notifications. */
  dispose() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }

  /**
   * Must run synchronously inside the user's click: a first-time connect needs
   * transient user activation, which the extension checks on the page's behalf.
   * There is deliberately no `await` before `provider.connect()`.
   */
  connect(_opts?: ConnectOptions): Promise<string[]> {
    return this.provider
      .connect(buildProviderConnectOptions(this.deps.chainId))
      .then((result) => this.storeConnection(result.accounts, result.network))
      .catch((error) => {
        throw mapProviderError(error, "connect");
      });
  }

  /**
   * A plain `connect()` without a gesture: resolves at once when the origin is
   * already approved, and fails with UNAUTHORIZED when it is not, which is
   * "no session" rather than an error.
   */
  async reconnect(): Promise<string[]> {
    try {
      const result = await this.provider.connect(
        buildProviderConnectOptions(this.deps.chainId)
      );

      return this.storeConnection(result.accounts, result.network);
    } catch (error) {
      if (
        isPeraProviderError(error) &&
        error.code === PERA_PROVIDER_ERROR_CODES.UNAUTHORIZED
      ) {
        await resetWalletDetailsFromStorage();

        return [];
      }

      throw mapProviderError(error, "reconnect");
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.provider.disconnect();
    } catch {
      // Best-effort; the local session is cleared regardless.
    }

    this._network = null;
    await resetWalletDetailsFromStorage();
  }

  async signTransaction(txns: PeraWalletTransaction[]): Promise<Uint8Array[]> {
    try {
      const response = await this.provider.signTransactions(txns);

      if (!Array.isArray(response)) {
        throw new Error(
          "The Pera extension returned an invalid signTransactions response"
        );
      }

      // One entry per input transaction in group order; `null` marks entries
      // the wallet was told not to sign (`signers: []`). Mirrors the mobile
      // path, which also drops the nulls before decoding.
      return response
        .filter((item): item is string => typeof item === "string")
        .map(base64ToUint8Array);
    } catch (error) {
      throw mapProviderError(error, "sign-txn");
    }
  }

  async signData(
    data: PeraWalletArbitraryData[],
    signer: string,
    _chainId: AlgorandChainIDs
  ): Promise<Uint8Array[]> {
    const payload = {
      data: data.map((item) => ({
        signer,
        data: Buffer.from(item.data).toString("base64"),
        message: item.message
      }))
    };

    try {
      const signatures = await this.provider.signData(payload);

      if (!Array.isArray(signatures)) {
        throw new Error("The Pera extension returned an invalid signData response");
      }

      // `base64ToUint8Array` runs on `atob`, and `atob(null)` decodes the
      // string "null" into three bytes, so an unsigned entry would otherwise
      // reach the dApp as a plausible-looking signature. Drop non-strings the
      // way `signTransaction` does.
      return signatures
        .filter((item): item is string => typeof item === "string")
        .map(base64ToUint8Array);
    } catch (error) {
      throw mapProviderError(error, "sign-data");
    }
  }

  async signArc60Data(
    payload: PeraWalletArc60SignData,
    metadata: SignMetadata
  ): Promise<PeraWalletArc60SignDataResponse> {
    const wireParams = buildArc60WireParams(payload, metadata);

    try {
      const signatures = await this.provider.signData(wireParams);
      const first = Array.isArray(signatures) ? signatures[0] : undefined;

      if (typeof first !== "string") {
        throw new Error("No signature returned from the Pera extension");
      }

      return buildArc60SignDataResponse(payload, base64ToUint8Array(first));
    } catch (error) {
      throw mapProviderError(error, "sign-data");
    }
  }

  private storeConnection(accounts: {address: string}[], network: PeraNetwork): string[] {
    const addresses = accounts.map((account) => account.address);

    this._network = network;
    saveWalletDetailsToStorage(addresses, "pera-wallet-extension");

    return addresses;
  }

  private handleProviderDisconnect() {
    // Another transport may own the current session (the user could have
    // connected with Pera mobile after revoking the extension); only an
    // extension session is dropped here.
    if (getWalletPlatformFromStorage() !== "extension") {
      return;
    }

    this._network = null;
    resetWalletDetailsFromStorage();
    this.deps.onDisconnect?.();
  }

  private handleProviderNetworkChanged(params: unknown) {
    const network = (params as {network?: PeraNetwork} | undefined)?.network;

    if (!network) {
      return;
    }

    // The extension broadcasts to every page it is injected into, including
    // ones whose session belongs to another transport. A dApp on a mobile
    // session must not be told to repoint its algod client because the
    // extension wallet — which it is not connected to — switched network.
    if (getWalletPlatformFromStorage() !== "extension") {
      return;
    }

    this._network = network;
    this.deps.onNetworkChanged?.({network});
  }
}

export {getPeraNetworkFromChainId, mapProviderError};
