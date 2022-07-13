import {PeraWalletTransaction} from "../../model/peraWalletModels";
import Teller from "./Teller";

export type PeraTeller =
  | {
      type: "CONNECT";
      data: {
        title: string;
        url: string;
        favicon?: string;
      };
    }
  | {
      type: "CONNECT_CALLBACK";
      data: {
        name?: string;
        address: string;
      };
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
      type: "SIGN_TXN_CALLBACK_ERROR";
      error: string;
    };

const appTellerManager = new Teller<PeraTeller>({
  channel: "pera-web-wallet"
});

export default appTellerManager;
