interface PeraWalletConnectErrorData {
    type:
        | 'MESSAGE_NOT_RECEIVED'
        | 'OPERATION_CANCELLED'
        | 'EXTENSION_NOT_AVAILABLE'
        // No longer thrown: the extension signs arbitrary data through
        // `window.pera`. Kept so existing consumer checks still compile.
        | 'EXTENSION_UNSUPPORTED_OPERATION'
        | 'CONNECT_MODAL_CLOSED'
        | 'CONNECT_CANCELLED'
        | 'CONNECT_NETWORK_MISMATCH'
        | 'SESSION_DISCONNECTED'
        | 'SESSION_UPDATE'
        | 'SESSION_CONNECT'
        | 'SESSION_RECONNECT'
        | 'SIGN_TRANSACTIONS'
        | 'SIGN_DATA'
        | 'SIGN_TXN_CANCELLED'
        | 'SIGN_TXN_NETWORK_MISMATCH'
        | 'SIGN_DATA_CANCELLED'
        | 'SIGN_DATA_NETWORK_MISMATCH'
        | 'SIGN_DATA_DOMAIN_MISMATCH'
        | 'SIGN_DATA_VERIFICATION_FAILED'
        | 'SIGN_DATA_NETWORK_REQUIRED'
        | 'SIGN_DATA_NETWORK_UNSUPPORTED'
        | 'SIGN_DATA_INVALID_ADDRESS'
        | 'SIGN_DATA_AUTH_ADDR_LOOKUP_FAILED'
        | 'INVALID_ALGOD_CLIENT'
        | 'EMPTY_SIGNATURES'
        | 'EMPTY_SIGNATURES_TIMEOUT'
        | 'EMPTY_SIGNATURES_NETWORK_REQUIRED'
        | 'EMPTY_SIGNATURES_NETWORK_UNSUPPORTED'
        | 'EMPTY_SIGNATURES_NETWORK_MISMATCH'
    detail?: unknown
}

class PeraWalletConnectError extends Error {
    data: PeraWalletConnectErrorData

    constructor(
        data: PeraWalletConnectErrorData,
        message: string,
        options?: ErrorOptions,
    ) {
        super(message, options)

        this.name = 'PeraWalletConnectError'
        this.data = data
    }
}

export { PeraWalletConnectError }
