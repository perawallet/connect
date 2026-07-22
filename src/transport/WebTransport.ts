import {WalletTransport} from "./WalletTransport";
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
}

export class WebTransport implements WalletTransport {
  readonly platform = "web" as const;
  private deps: WebTransportDeps;

  constructor(deps: WebTransportDeps) {
    this.deps = deps;
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
