import {WalletTransport} from "./WalletTransport";
import {buildArc60WireParams, buildArc60SignDataResponse} from "./arc60Wire";
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
  EMPTY_SIGNATURES_METHOD,
  EMPTY_SIGNATURES_TIMEOUT_MS,
  withTimeout
} from "../util/emptySignatures";
import {
  removeModalWrapperFromDOM,
  PERA_WALLET_REDIRECT_MODAL_ID,
  PERA_WALLET_SIGN_TXN_TOAST_ID,
  openPeraWalletRedirectModal,
  openPeraWalletSignTxnToast
} from "../modal/peraWalletConnectModalUtils";
import {isMobile} from "../util/device/deviceUtils";

// WalletConnect type is intentionally loose to avoid coupling the transport to
// the connector's full type surface.
type Connector = {
  sendCustomRequest: (request: any, options?: any) => Promise<any>;
  accounts?: string[];
} | null;

export interface MobileTransportDeps {
  connector: Connector;
  shouldShowSignTxnToast: boolean;
  isInWebview: boolean;
  getSilent: () => Promise<boolean>;
}

/**
 * Asks the wallet for its accounts' empty signatures. This is a function rather
 * than a MobileTransport method because the wallet answers without prompting:
 * the class's constructor opens the signing toast or redirect modal, and this
 * request must show nothing, send no push notification and open no deep link.
 * Pera apps that don't know the method drop it silently, so the timeout is the
 * only way out.
 */
export function requestEmptySignatures(
  connector: {sendCustomRequest: (request: any, options?: any) => Promise<any>},
  caipChainId: string
): Promise<unknown> {
  const request = formatJsonRpcRequest(EMPTY_SIGNATURES_METHOD, {chainId: caipChainId});

  return withTimeout(
    // WalletConnect v1 throws synchronously when the session is gone.
    Promise.resolve().then(() =>
      connector.sendCustomRequest(request, {forcePushNotification: false})
    ),
    EMPTY_SIGNATURES_TIMEOUT_MS,
    () =>
      new PeraWalletConnectError(
        {type: "EMPTY_SIGNATURES_TIMEOUT"},
        `Pera didn't answer ${EMPTY_SIGNATURES_METHOD} within ${EMPTY_SIGNATURES_TIMEOUT_MS} ms. Its accounts' types stay unknown.`
      )
  ).catch((error) => {
    if (error instanceof PeraWalletConnectError) {
      throw error;
    }

    throw new PeraWalletConnectError(
      {type: "EMPTY_SIGNATURES", detail: {reason: "wallet-error", error}},
      error?.message || `Pera couldn't answer ${EMPTY_SIGNATURES_METHOD}.`
    );
  });
}

export class MobileTransport implements WalletTransport {
  readonly platform = "mobile" as const;
  private deps: MobileTransportDeps;

  constructor(deps: MobileTransportDeps) {
    this.deps = deps;

    if (isMobile() && !deps.isInWebview) {
      // This is to automatically open the wallet app when trying to sign with it.
      openPeraWalletRedirectModal();
    } else if (!isMobile() && deps.shouldShowSignTxnToast) {
      // This is to inform user go the wallet app when trying to sign with it.
      openPeraWalletSignTxnToast();
    }
  }

  private get connector(): Connector {
    return this.deps.connector;
  }

  setConnector(connector: Connector) {
    this.deps.connector = connector;
  }

  private cleanupModals() {
    removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
    removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);
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
      this.cleanupModals();
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
          {type: "SIGN_DATA", detail: error},
          error.message || "Failed to sign data"
        )
      );
    } finally {
      this.cleanupModals();
    }
  }

  async signArc60Data(
    payload: PeraWalletArc60SignData,
    metadata: SignMetadata
  ): Promise<PeraWalletArc60SignDataResponse> {
    if (!this.connector) {
      throw new Error("PeraWalletConnect was not initialized correctly.");
    }

    const wireParams = buildArc60WireParams(payload, metadata);
    const request = formatJsonRpcRequest("algo_signData", wireParams);

    try {
      const silent = await this.deps.getSilent();
      const response = await this.connector.sendCustomRequest(request as any, {
        forcePushNotification: !silent
      });
      const responseArray = Array.isArray(response) ? response : [response];
      const first = responseArray.filter(Boolean)[0];

      if (!first) {
        throw new Error("No signature returned from wallet.");
      }

      const signature =
        typeof first === "string"
          ? base64ToUint8Array(first)
          : Uint8Array.from(first as number[]);

      return buildArc60SignDataResponse(payload, signature);
    } catch (error) {
      return Promise.reject(
        new PeraWalletConnectError(
          {type: "SIGN_DATA", detail: error},
          (error as Error)?.message || "Failed to sign ARC-60 data"
        )
      );
    } finally {
      this.cleanupModals();
    }
  }
}
