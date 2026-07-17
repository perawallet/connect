import algosdk from "algosdk";

import {WalletTransport, ConnectOptions} from "../WalletTransport";
import {Arc0027Client, Arc0027RequestError} from "./arc0027Client";
import {DiscoverResult, ARC0027_ERROR_CODES} from "./arc0027Types";
import {isArc60OriginMismatch} from "./originBinding";
import PeraWalletConnectError from "../../util/PeraWalletConnectError";
import {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  SignMetadata,
  PeraWalletTransaction
} from "../../util/model/peraWalletModels";
import {AlgorandChainIDs} from "../../util/peraWalletTypes";
import {base64ToUint8Array} from "../../util/transaction/transactionUtils";
import {
  saveWalletDetailsToStorage,
  resetWalletDetailsFromStorage
} from "../../util/storage/storageUtils";

function mapError(error: unknown, context: "connect" | "sign"): PeraWalletConnectError {
  if (error instanceof Arc0027RequestError) {
    if (error.code === ARC0027_ERROR_CODES.MethodCanceledError) {
      return new PeraWalletConnectError(
        {type: context === "connect" ? "CONNECT_MODAL_CLOSED" : "SIGN_TXN_CANCELLED"},
        error.message
      );
    }

    if (error.code === ARC0027_ERROR_CODES.UnauthorizedSignerError) {
      return new PeraWalletConnectError({type: "SESSION_RECONNECT"}, error.message);
    }
  }

  return new PeraWalletConnectError(
    {type: "SIGN_TRANSACTIONS", detail: error},
    (error as Error)?.message || "ARC-0027 request failed"
  );
}

export class ExtensionTransport implements WalletTransport {
  readonly platform = "extension" as const;
  private client: Arc0027Client;

  constructor(client: Arc0027Client = new Arc0027Client()) {
    this.client = client;
  }

  static discover(
    client: Arc0027Client = new Arc0027Client()
  ): Promise<DiscoverResult | null> {
    return client.discover();
  }

  async connect(_opts?: ConnectOptions): Promise<string[]> {
    try {
      const result = await this.client.request("enable", {});
      const accounts = ((result.accounts as {address: string}[]) || []).map(
        (item) => item.address
      );

      saveWalletDetailsToStorage(accounts, "pera-wallet-extension");

      return accounts;
    } catch (error) {
      throw mapError(error, "connect");
    }
  }

  async reconnect(): Promise<string[]> {
    // The extension is the source of truth for per-origin permission. Confirm
    // it is still installed; the next real call re-checks the grant (4100 →
    // caller disconnects). Return whatever is stored.
    const info = await this.client.discover();

    if (!info) {
      await resetWalletDetailsFromStorage();

      return [];
    }

    // Accounts are read from storage by the orchestrator; nothing to re-fetch.
    return [];
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.request("disable", {});
    } catch {
      // Best-effort; clear local state regardless.
    }

    await resetWalletDetailsFromStorage();
  }

  async signTransaction(
    txns: PeraWalletTransaction[],
    _signerAddress?: string
  ): Promise<Uint8Array[]> {
    try {
      const result = await this.client.request("sign_transactions", {txns});
      const stxns = (result.stxns as (string | null)[]) || [];

      return stxns
        .filter((value): value is string => typeof value === "string")
        .map(base64ToUint8Array);
    } catch (error) {
      throw mapError(error, "sign");
    }
  }

  signData(
    _data: PeraWalletArbitraryData[],
    _signer: string,
    _chainId: AlgorandChainIDs
  ): Promise<Uint8Array[]> {
    return Promise.reject(
      new PeraWalletConnectError(
        {type: "EXTENSION_UNSUPPORTED_OPERATION"},
        "Arbitrary-data signing is not supported by the Pera extension; use signArc60Data, or connect via Pera mobile / Pera Web"
      )
    );
  }

  async signArc60Data(
    payload: PeraWalletArc60SignData,
    metadata: SignMetadata,
    verifySignature?: boolean
  ): Promise<PeraWalletArc60SignDataResponse> {
    // Fast client-side pre-check mirroring the extension's SIWA origin binding.
    if (isArc60OriginMismatch(payload.domain, window.location.origin)) {
      throw new PeraWalletConnectError(
        {type: "SIGN_DATA_DOMAIN_MISMATCH"},
        `ARC-60 domain "${payload.domain}" does not match the page origin "${window.location.origin}"`
      );
    }

    const dataBase64 = Buffer.from(payload.data).toString("base64");
    const wireParams: Record<string, unknown> = {
      data: dataBase64,
      signer: payload.signer,
      domain: payload.domain,
      authenticatorData: Buffer.from(payload.authenticatorData).toString("base64"),
      metadata
    };

    if (payload.requestId !== undefined) wireParams.requestId = payload.requestId;
    if (payload.hdPath !== undefined) wireParams.hdPath = payload.hdPath;

    try {
      const result = await this.client.request("sign_message", wireParams);
      const signature = base64ToUint8Array(result.signature as string);

      // Signature verification is delegated to the orchestrator
      // (PeraWalletConnect.verifyArc60Signature) so all transports share one
      // path; `verifySignature` is accepted here for interface parity.
      if (verifySignature) { /* verification handled by orchestrator */ }

      return {
        data: dataBase64,
        signer: algosdk.decodeAddress(String(payload.signer)).publicKey,
        domain: payload.domain,
        authenticatorData: payload.authenticatorData,
        ...(payload.requestId !== undefined && {requestId: payload.requestId}),
        ...(payload.hdPath !== undefined && {hdPath: payload.hdPath}),
        signature
      };
    } catch (error) {
      throw mapError(error, "sign");
    }
  }
}
