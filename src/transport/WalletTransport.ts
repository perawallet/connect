import {AlgorandChainIDs, PeraWalletPlatformType} from "../util/peraWalletTypes";
import {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  PeraWalletTransaction,
  SignMetadata
} from "../util/model/peraWalletModels";

export type ConnectOptions = {selectedAccount?: string};

// Session lifecycle (connect/reconnect/disconnect) is intentionally not part of
// this interface: only ExtensionTransport owns a real, persistent session with
// its counterparty. Mobile's WalletConnect session and Web's inline connect
// flow are both owned and driven directly by PeraWalletConnect.
export interface WalletTransport {
  readonly platform: PeraWalletPlatformType;
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
    metadata: SignMetadata
  ): Promise<PeraWalletArc60SignDataResponse>;
}
