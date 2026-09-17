interface PeraWalletConnectErrorData {
  type:
    | "MESSAGE_NOT_RECEIVED"
    | "OPERATION_CANCELLED"
    | "EXTENSION_NOT_AVAILABLE"
    // No longer thrown: the extension signs arbitrary data through
    // `window.pera`. Kept so existing consumer checks still compile.
    | "EXTENSION_UNSUPPORTED_OPERATION"

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
    | "SIGN_DATA"
    | "SIGN_TXN_CANCELLED"
    | "SIGN_TXN_NETWORK_MISMATCH"
    | "SIGN_DATA_CANCELLED"
    | "SIGN_DATA_NETWORK_MISMATCH"
    | "SIGN_DATA_DOMAIN_MISMATCH"
    | "SIGN_DATA_VERIFICATION_FAILED"
    | "SIGN_DATA_NETWORK_REQUIRED"
    | "SIGN_DATA_NETWORK_UNSUPPORTED"
    | "SIGN_DATA_INVALID_ADDRESS"
    | "SIGN_DATA_AUTH_ADDR_LOOKUP_FAILED"

    // Configuration
    | "INVALID_ALGOD_CLIENT";
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
