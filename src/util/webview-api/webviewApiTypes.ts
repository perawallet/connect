/**
 * Webview API Types
 * Type definitions for webview API communication
 */

/**
 * Platform types
 */
export type Platform = 'android' | 'ios' | 'unknown'

/**
 * Theme options
 */
export type Theme = 'light' | 'dark'

/**
 * Network options
 */
export type Network = 'mainnet' | 'testnet'

/**
 * Public settings accessible via Pera Connect (no privileged access required)
 */
export interface PublicSettings {
    theme: Theme
    network: Network
    language: string
    currency: string
}

/**
 * JSON-RPC 2.0 Error Codes
 * Standard error codes as per JSON-RPC 2.0 specification
 */
export enum JsonRpcErrorCode {
    ParseError = -32_700,
    InvalidRequest = -32_600,
    MethodNotFound = -32_601,
    InvalidParams = -32_602,
    InternalError = -32_603,
    ServerErrorStart = -32_000,
    ServerErrorEnd = -32_099,
}

/**
 * JSON-RPC 2.0 Request Object
 * Used for method calls that expect a response
 */
export interface JsonRpcRequest {
    jsonrpc: '2.0'
    method: string
    params?: unknown /* Can be Array (by-position) or Object (by-name) */
    id: string | number
}

/**
 * JSON-RPC 2.0 Notification Object
 * Used for method calls that don't expect a response (no id field)
 */
export interface JsonRpcNotification {
    jsonrpc: '2.0'
    method: string
    params?: unknown
    // No id field - this is what makes it a notification
}

/**
 * JSON-RPC 2.0 Error Object
 * Used in error responses
 */
export interface JsonRpcError {
    code: number
    message: string
    data?: unknown
}

/**
 * JSON-RPC 2.0 Success Response Object
 */
export interface JsonRpcSuccessResponse {
    jsonrpc: '2.0'
    result: unknown
    id: string | number | null
}

/**
 * JSON-RPC 2.0 Error Response Object
 */
export interface JsonRpcErrorResponse {
    jsonrpc: '2.0'
    error: JsonRpcError
    id: string | number | null
}

/**
 * JSON-RPC 2.0 Response Object
 * Union of success and error responses
 */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse

/**
 * JSON-RPC 2.0 Batch Request
 * Array of request/notification objects
 */
export type JsonRpcBatchRequest = Array<JsonRpcRequest | JsonRpcNotification>

/**
 * JSON-RPC 2.0 Batch Response
 * Array of response objects (notifications don't have responses)
 */
export type JsonRpcBatchResponse = JsonRpcResponse[]
