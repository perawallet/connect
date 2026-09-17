import algosdk from "algosdk";

import {AlgorandNodeProviderType, NetworkToggle} from "./algodTypes";
import {getAlgosdkCredentialsForNetwork} from "./algodUtils";

class AlgodManager {
  client: algosdk.Algodv2;
  providerType: AlgorandNodeProviderType;

  constructor({
    network,
    providerType,
    client
  }: {
    network: NetworkToggle;
    providerType: AlgorandNodeProviderType;
    shouldCheckTransactionFee?: boolean;
    /** Supplied by the integrator; used as-is in place of Pera's node. */
    client?: algosdk.Algodv2;
  }) {
    const algosdkCredentials = getAlgosdkCredentialsForNetwork(network, providerType);

    this.providerType = providerType;
    this.client =
      client ??
      new algosdk.Algodv2(
        algosdkCredentials.tokens.client,
        algosdkCredentials.server.client,
        algosdkCredentials.port
      );
  }

  updateClient(
    network: NetworkToggle,
    providerType: AlgorandNodeProviderType,
    client?: algosdk.Algodv2
  ) {
    const algosdkCredentials = getAlgosdkCredentialsForNetwork(network, providerType);

    this.providerType = providerType;
    this.client =
      client ??
      new algosdk.Algodv2(
        algosdkCredentials.tokens.client,
        algosdkCredentials.server.client,
        algosdkCredentials.port
      );
  }
}

export {AlgodManager};
