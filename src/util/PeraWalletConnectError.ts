interface PeraWalletConnectErrorData {
  type:
    | "SIGN_TRANSACTIONS"
    | "SESSION_DISCONNECTED"
    | "SESSION_UPDATE"
    | "SESSION_CONNECT"
    | "SESSION_RECONNECT"
    | "CONNECT_MODAL_CLOSED"
    | "CONNECT_CANCELLED"
    | "SIGN_TXN_CANCELLED"
    | "CONNECT_NETWORK_MISMATCH"
    | "SIGN_TXN_NETWORK_MISMATCH"
    | "MESSAGE_NOT_RECEIVED"
    | "OPERATION_CANCELLED";
  detail?: any;
}

class PeraWalletConnectError extends Error {
  data: PeraWalletConnectErrorData;

  constructor(data: PeraWalletConnectErrorData, message: string, ...args: any[]) {
    super(...args);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PeraWalletConnectError);
    }

    this.name = "PeraWalletConnectError";
    this.data = data;
    this.message = message;
  }
}

export default PeraWalletConnectError;
