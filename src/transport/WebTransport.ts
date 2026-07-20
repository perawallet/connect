import {WalletTransport, ConnectOptions} from "./WalletTransport";
import {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  SignMetadata,
  PeraWalletTransaction
} from "../util/model/peraWalletModels";
import {AlgorandChainIDs} from "../util/peraWalletTypes";
import {runWebSignTransactionFlow} from "../util/sign/signTransactionFlow";

export interface WebTransportDeps {
  getWebWalletURL: () => Promise<string>;
  connectImpl?: (opts?: ConnectOptions) => Promise<string[]>;
  reconnectImpl?: () => Promise<string[]>;
  disconnectImpl?: () => Promise<void>;
}

export class WebTransport implements WalletTransport {
  readonly platform = "web" as const;
  private deps: WebTransportDeps;

  constructor(deps: WebTransportDeps) {
    this.deps = deps;
  }

  connect(opts?: ConnectOptions): Promise<string[]> {
    if (!this.deps.connectImpl) {
      return Promise.reject(new Error("WebTransport.connect not wired"));
    }

    return this.deps.connectImpl(opts);
  }

  reconnect(): Promise<string[]> {
    if (!this.deps.reconnectImpl) {
      return Promise.reject(new Error("WebTransport.reconnect not wired"));
    }

    return this.deps.reconnectImpl();
  }

  disconnect(): Promise<void> {
    return this.deps.disconnectImpl ? this.deps.disconnectImpl() : Promise.resolve();
  }

  async signTransaction(
    signTxnRequestParams: PeraWalletTransaction[]
  ): Promise<Uint8Array[]> {
    const webWalletURL = await this.deps.getWebWalletURL();

    return new Promise<Uint8Array[]>((resolve, reject) =>
      runWebSignTransactionFlow({
        signTxnRequestParams,
        webWalletURL,
        method: "SIGN_TXN",
        resolve,
        reject
      })
    );
  }

  async signData(
    data: PeraWalletArbitraryData[],
    signer: string,
    chainId: AlgorandChainIDs
  ): Promise<Uint8Array[]> {
    const webWalletURL = await this.deps.getWebWalletURL();

    return new Promise<Uint8Array[]>((resolve, reject) =>
      runWebSignTransactionFlow({
        method: "SIGN_DATA",
        signTxnRequestParams: data,
        signer,
        chainId,
        webWalletURL,
        resolve,
        reject
      })
    );
  }

  signArc60Data(
    _payload: PeraWalletArc60SignData,
    _metadata: SignMetadata
  ): Promise<PeraWalletArc60SignDataResponse> {
    return Promise.reject(
      new Error(
        "ARC-60 signing is currently only supported via the Pera mobile wallet or the Pera extension."
      )
    );
  }
}
