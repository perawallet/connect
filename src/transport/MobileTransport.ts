import algosdk from "algosdk";

import {WalletTransport, ConnectOptions} from "./WalletTransport";
import PeraWalletConnectError from "../util/PeraWalletConnectError";
import {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  SignMetadata,
  PeraWalletTransaction
} from "../util/model/peraWalletModels";
import {AlgorandChainIDs} from "../util/peraWalletTypes";
import {
  base64ToUint8Array,
  formatJsonRpcRequest
} from "../util/transaction/transactionUtils";
import {
  removeModalWrapperFromDOM,
  PERA_WALLET_REDIRECT_MODAL_ID,
  PERA_WALLET_SIGN_TXN_TOAST_ID
} from "../modal/peraWalletConnectModalUtils";

// WalletConnect type is intentionally loose to avoid coupling the transport to
// the connector's full type surface.
type Connector = {
  sendCustomRequest: (request: unknown, options?: unknown) => Promise<any>;
  accounts?: string[];
} | null;

export interface MobileTransportDeps {
  connector: Connector;
  shouldShowSignTxnToast: boolean;
  isInWebview: boolean;
  getSilent: () => Promise<boolean>;
  // connect/reconnect are owned by the orchestrator (WalletConnect session +
  // modal lifecycle); injected so MobileTransport satisfies WalletTransport.
  connectImpl?: (opts?: ConnectOptions) => Promise<string[]>;
  reconnectImpl?: () => Promise<string[]>;
  disconnectImpl?: () => Promise<void>;
}

export class MobileTransport implements WalletTransport {
  readonly platform = "mobile" as const;
  private deps: MobileTransportDeps;

  constructor(deps: MobileTransportDeps) {
    this.deps = deps;
  }

  private get connector(): Connector {
    return this.deps.connector;
  }

  setConnector(connector: Connector) {
    this.deps.connector = connector;
  }

  connect(opts?: ConnectOptions): Promise<string[]> {
    if (!this.deps.connectImpl) {
      return Promise.reject(new Error("MobileTransport.connect not wired"));
    }

    return this.deps.connectImpl(opts);
  }

  reconnect(): Promise<string[]> {
    if (!this.deps.reconnectImpl) {
      return Promise.reject(new Error("MobileTransport.reconnect not wired"));
    }

    return this.deps.reconnectImpl();
  }

  disconnect(): Promise<void> {
    return this.deps.disconnectImpl ? this.deps.disconnectImpl() : Promise.resolve();
  }

  async signTransaction(
    signTxnRequestParams: PeraWalletTransaction[]
  ): Promise<Uint8Array[]> {
    if (!this.connector) {
      throw new Error("PeraWalletConnect was not initialized correctly.");
    }

    const formattedSignTxnRequest = formatJsonRpcRequest("algo_signTxn", [
      signTxnRequestParams
    ]);

    try {
      const silent = await this.deps.getSilent();
      const response = await this.connector.sendCustomRequest(formattedSignTxnRequest, {
        forcePushNotification: !silent
      });
      const nonNullResponse = response.filter(Boolean) as (string | number[])[];

      return typeof nonNullResponse[0] === "string"
        ? (nonNullResponse as string[]).map(base64ToUint8Array)
        : (nonNullResponse as number[][]).map((item) => Uint8Array.from(item));
    } catch (error: any) {
      return Promise.reject(
        new PeraWalletConnectError(
          {type: "SIGN_TRANSACTIONS", detail: error},
          error.message || "Failed to sign transaction"
        )
      );
    } finally {
      removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
      removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);
    }
  }

  async signData(
    data: PeraWalletArbitraryData[],
    signer: string,
    chainId: AlgorandChainIDs
  ): Promise<Uint8Array[]> {
    if (!this.connector) {
      throw new Error("PeraWalletConnect was not initialized correctly.");
    }

    const b64encodedData = data.map((item) => ({
      data: Buffer.from(item.data).toString("base64"),
      message: item.message
    }));
    const formattedSignTxnRequest = formatJsonRpcRequest(
      "algo_signData",
      b64encodedData.map((item) => ({...item, signer, chainId}))
    );

    try {
      const silent = await this.deps.getSilent();
      const response = await this.connector.sendCustomRequest(formattedSignTxnRequest, {
        forcePushNotification: !silent
      });

      return typeof response[0] === "string"
        ? (response as string[]).map(base64ToUint8Array)
        : (response as number[][]).map((item) => Uint8Array.from(item));
    } catch (error: any) {
      return Promise.reject(
        new PeraWalletConnectError(
          {type: "SIGN_TRANSACTIONS", detail: error},
          error.message || "Failed to sign transaction"
        )
      );
    } finally {
      removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
      removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);
    }
  }

  async signArc60Data(
    payload: PeraWalletArc60SignData,
    metadata: SignMetadata
  ): Promise<PeraWalletArc60SignDataResponse> {
    if (!this.connector) {
      throw new Error("PeraWalletConnect was not initialized correctly.");
    }

    const dataBase64 = Buffer.isEncoding(metadata.encoding)
      ? Buffer.from(payload.data, metadata.encoding).toString("base64")
      : payload.data;

    const wireParams: Record<string, unknown> = {
      data: dataBase64,
      signer: algosdk.encodeAddress(payload.signer),
      domain: payload.domain,
      authenticatorData: Buffer.from(payload.authenticatorData).toString("base64"),
      metadata
    };

    if (payload.requestId !== undefined) wireParams.requestId = payload.requestId;
    if (payload.hdPath !== undefined) wireParams.hdPath = payload.hdPath;

    const request = formatJsonRpcRequest("algo_signData", wireParams);

    try {
      const silent = await this.deps.getSilent();
      const response = await this.connector.sendCustomRequest(request as any, {
        forcePushNotification: !silent
      });
      const responseArray = Array.isArray(response) ? response : [response];
      const first = responseArray.filter(Boolean)[0];

      const effectiveSigner = algosdk.encodeAddress(payload.signer);

      if (!first) {
        throw new Error("No signature returned from wallet.");
      }

      const signature =
        typeof first === "string"
          ? base64ToUint8Array(first)
          : Uint8Array.from(first as number[]);

      return {
        data: payload.data,
        signer: algosdk.decodeAddress(effectiveSigner).publicKey,
        domain: payload.domain,
        authenticatorData: payload.authenticatorData,
        ...(payload.requestId !== undefined && {requestId: payload.requestId}),
        ...(payload.hdPath !== undefined && {hdPath: payload.hdPath}),
        signature
      };
    } catch (error) {
      return Promise.reject(
        new PeraWalletConnectError(
          {type: "SIGN_TRANSACTIONS", detail: error},
          (error as Error)?.message || "Failed to sign ARC-60 data"
        )
      );
    } finally {
      removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
      removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);
    }
  }
}
