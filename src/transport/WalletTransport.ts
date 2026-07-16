import {AlgorandChainIDs, PeraWalletPlatformType} from "../util/peraWalletTypes";
import {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  PeraWalletTransaction
} from "../util/model/peraWalletModels";

export type ConnectOptions = {selectedAccount?: string};

export interface WalletTransport {
  readonly platform: PeraWalletPlatformType;
  connect(opts?: ConnectOptions): Promise<string[]>;
  reconnect(): Promise<string[]>;
  disconnect(): Promise<void>;
  signTransaction(
    txns: PeraWalletTransaction[],
    signerAddress?: string
  ): Promise<Uint8Array[]>;
  signData(
    data: PeraWalletArbitraryData[],
    signer: string,
    chainId: AlgorandChainIDs
  ): Promise<Uint8Array[]>;
  signArc60Data(
    payload: PeraWalletArc60SignData,
    verifySignature?: boolean
  ): Promise<PeraWalletArc60SignDataResponse>;
}
