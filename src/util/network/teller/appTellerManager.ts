import {
  PeraWalletArbitraryData,
  PeraWalletTransaction
} from "../../model/peraWalletModels";
import {AlgorandChainIDs} from "../../peraWalletTypes";
import Teller from "./Teller";

export type PeraTeller =
  | {
      type: "CONNECT";
      data: {
        title: string;
        url: string;
        favicon?: string;
        chainId?: number;
      };
    }
  | {
      type: "CONNECT_CALLBACK";
      data: {
        name?: string;
        addresses: string[];
      };
    }
  | {
      type: "CONNECT_NETWORK_MISMATCH";
      error: string;
    }
  | {
      type: "CREATE_PASSCODE_EMBEDDED";
    }
  | {
      type: "SELECT_ACCOUNT_EMBEDDED";
    }
  | {
      type: "CREATE_PASSCODE_EMBEDDED_CALLBACK";
    }
  | {
      type: "SELECT_ACCOUNT_EMBEDDED_CALLBACK";
    }
  | {
      type: "SIGN_TXN";
      txn: PeraWalletTransaction[];
    }
  | {
      type: "SIGN_TXN_CALLBACK";
      signedTxns: {
        txnId: string;
        signedTxn: string;
      }[];
    }
  | {
      type: "SIGN_TXN_NETWORK_MISMATCH";
      error: string;
    }
  | {
      type: "SIGN_TXN_CALLBACK_ERROR";
      error: string;
    }
  | {
      type: "SIGN_DATA";
      signer: string;
      chainId: AlgorandChainIDs;
      data: PeraWalletArbitraryData[];
    }
  | {
      type: "SIGN_DATA_CALLBACK";
      signedData: {
        signedData: string;
      }[];
    }
  | {
      type: "SIGN_DATA_NETWORK_MISMATCH";
      error: string;
    }
  | {
      type: "SIGN_DATA_CALLBACK_ERROR";
      error: string;
    }
  | {
      type: "SESSION_DISCONNECTED";
      error: string;
    }
  | {
      type: "TAB_OPEN";
    }
  | {
      type: "TAB_OPEN_RECEIVED";
    }
  | {
      type: "IFRAME_INITIALIZED";
    }
  | {
      type: "IFRAME_INITIALIZED_RECEIVED";
    };

const appTellerManager = new Teller<PeraTeller>({
  channel: "pera-web-wallet"
});

export default appTellerManager;
