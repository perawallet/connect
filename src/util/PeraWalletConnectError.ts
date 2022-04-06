interface PeraWalletConnectErrorData {
  type:
    | "SIGN_TRANSACTIONS"
    | "SESSION_DISCONNECT"
    | "SESSION_UPDATE"
    | "SESSION_CONNECT"
    | "SESSION_RECONNECT";
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
