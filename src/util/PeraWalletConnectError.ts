interface PeraWalletConnectErrorData {
  type:
    | "MESSAGE_NOT_RECEIVED"
    | "OPERATION_CANCELLED"

    // Connect
    | "CONNECT_MODAL_CLOSED"
    | "CONNECT_CANCELLED"
    | "CONNECT_NETWORK_MISMATCH"

    // Reconnect
    | "SESSION_DISCONNECTED"
    | "SESSION_UPDATE"
    | "SESSION_CONNECT"
    | "SESSION_RECONNECT"

    // Sign
    | "SIGN_TRANSACTIONS"
    | "SIGN_TXN_CANCELLED"
    | "SIGN_TXN_NETWORK_MISMATCH"
    | "SIGN_DATA_CANCELLED"
    | "SIGN_DATA_NETWORK_MISMATCH";
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
