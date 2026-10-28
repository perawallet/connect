export type Platform = 'android' | 'ios' | 'unknown'

export type Theme = 'light' | 'dark'

export type Network = 'mainnet' | 'testnet'

/** The privacy-safe subset of app settings; needs no privileged access. */
export interface PublicSettings {
    theme: Theme
    network: Network
    language: string
    currency: string
}

export enum JsonRpcErrorCode {
    ParseError = -32_700,
    InvalidRequest = -32_600,
    MethodNotFound = -32_601,
    InvalidParams = -32_602,
    InternalError = -32_603,
    ServerErrorStart = -32_000,
    ServerErrorEnd = -32_099,
}

export interface JsonRpcRequest {
    jsonrpc: '2.0'
    method: string
    params?: unknown /* Can be Array (by-position) or Object (by-name) */
    id: string | number
}

export interface JsonRpcNotification {
    jsonrpc: '2.0'
    method: string
    params?: unknown
    // No id field: that is what makes it a notification.
}

export interface JsonRpcError {
    code: number
    message: string
    data?: unknown
}

export interface JsonRpcSuccessResponse {
    jsonrpc: '2.0'
    result: unknown
    id: string | number | null
}

export interface JsonRpcErrorResponse {
    jsonrpc: '2.0'
    error: JsonRpcError
    id: string | number | null
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse

export type JsonRpcBatchRequest = Array<JsonRpcRequest | JsonRpcNotification>

// Notifications get no response, so this can be shorter than its request.
export type JsonRpcBatchResponse = JsonRpcResponse[]
