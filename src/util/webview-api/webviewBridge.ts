/**
 * Unified Webview Bridge
 * Handles communication with both Android and iOS platforms using JSON-RPC 2.0
 * Combines JSON-RPC utilities, error handling, platform detection, message listener, and bridge functions
 */

import {
    type JsonRpcRequest,
    type JsonRpcNotification,
    type JsonRpcResponse,
    type JsonRpcBatchRequest,
    type JsonRpcBatchResponse,
    type JsonRpcError,
    JsonRpcErrorCode,
} from './webviewApiTypes'

/**
 * Mobile method names that can be called via the bridge
 */
export type MobileMethodName = 'getPublicSettings'

/**
 * Request ID generator
 * Uses timestamp + incrementing counter for better uniqueness
 */
let requestIdCounter = 0

/**
 * Generate a unique request ID
 * Combines timestamp (last 8 digits) with a counter for uniqueness
 * This ensures uniqueness even if counter wraps around or multiple SDK instances exist
 */
function generateRequestId(): number {
    const timestamp = Date.now()
    const counter = requestIdCounter++

    // Use last 8 digits of timestamp + 4-digit counter
    // This gives us: YYYYMMDDHHMMSS + 0000-9999 counter
    // Example: 12345678 + 0001 = 123456780001
    const timestampPart = timestamp.toString().slice(-8)
    const counterPart = counter.toString().padStart(4, '0')

    return parseInt(`${timestampPart}${counterPart}`, 10)
}

/**
 * Create a JSON-RPC 2.0 request object
 */
function createRequest(
    method: string,
    params?: unknown,
    id?: number | string,
): JsonRpcRequest {
    const requestId = id ?? generateRequestId()

    return {
        jsonrpc: '2.0',
        method,
        ...(params !== undefined && { params }),
        id: requestId,
    }
}

/**
 * Type guard: Check if object is a JSON-RPC response (success or error)
 */
function isJsonRpcResponse(obj: unknown): obj is JsonRpcResponse {
    if (!obj || typeof obj !== 'object') {
        return false
    }

    const resp = obj as Record<string, unknown>

    return (
        resp.jsonrpc === '2.0' &&
        ('result' in resp || 'error' in resp) &&
        (resp.id === null ||
            typeof resp.id === 'string' ||
            typeof resp.id === 'number')
    )
}

/**
 * Type guard: Check if object is a JSON-RPC batch response
 */
function isJsonRpcBatchResponse(obj: unknown): obj is JsonRpcBatchResponse {
    return Array.isArray(obj) && obj.every(item => isJsonRpcResponse(item))
}

/**
 * Type guard: Check if object is a JSON-RPC notification
 */
function isJsonRpcNotification(obj: unknown): obj is JsonRpcNotification {
    if (!obj || typeof obj !== 'object') {
        return false
    }

    const notif = obj as Record<string, unknown>

    return (
        notif.jsonrpc === '2.0' &&
        typeof notif.method === 'string' &&
        !('id' in notif)
    )
}

/**
 * Base class for JSON-RPC errors
 */
class JsonRpcErrorClass extends Error {
    public readonly code: number
    public readonly data?: unknown

    constructor(error: JsonRpcError) {
        super(error.message)
        this.name = 'JsonRpcError'
        this.code = error.code
        this.data = error.data
    }

    /**
     * Get error message with code
     */
    getMessage(): string {
        return `[${this.code}] ${this.message}`
    }
}

/**
 * Convert JSON-RPC error object to appropriate error class instance
 */
function createJsonRpcError(error: JsonRpcError): JsonRpcErrorClass {
    switch (error.code) {
        case JsonRpcErrorCode.ParseError: {
            return new JsonRpcErrorClass({
                code: JsonRpcErrorCode.ParseError,
                message: 'Parse error',
                data: error.data,
            })
        }
        case JsonRpcErrorCode.InvalidRequest: {
            return new JsonRpcErrorClass({
                code: JsonRpcErrorCode.InvalidRequest,
                message: 'Invalid Request',
                data: error.data,
            })
        }
        case JsonRpcErrorCode.MethodNotFound: {
            return new JsonRpcErrorClass({
                code: JsonRpcErrorCode.MethodNotFound,
                message: error.message || 'Method not found',
                data: error.data,
            })
        }
        case JsonRpcErrorCode.InvalidParams: {
            return new JsonRpcErrorClass({
                code: JsonRpcErrorCode.InvalidParams,
                message: 'Invalid params',
                data: error.data,
            })
        }
        case JsonRpcErrorCode.InternalError: {
            return new JsonRpcErrorClass({
                code: JsonRpcErrorCode.InternalError,
                message: 'Internal error',
                data: error.data,
            })
        }
        default: {
            // Server errors (-32000 to -32099) or custom errors
            if (
                error.code >= JsonRpcErrorCode.ServerErrorStart &&
                error.code <= JsonRpcErrorCode.ServerErrorEnd
            ) {
                return new JsonRpcErrorClass(error)
            }
            // Custom application errors
            return new JsonRpcErrorClass(error)
        }
    }
}

/**
 * Get Android interface if available
 */
function getAndroidInterface() {
    return window.peraMobileInterface as PeraMobileAndroidInterface | undefined
}

/**
 * Get iOS interface if available
 */
function getIosInterface() {
    return window.webkit?.messageHandlers as PeraMobileIosInterface | undefined
}

type ActionHandler<T> = (payload: T) => void

interface PendingRequest<T> {
    resolve: (value: T) => void
    reject: (error: Error) => void
    timeoutHandle: ReturnType<typeof setTimeout>
    method: string
}

class MessageListener {
    private listeners: Map<string, Set<ActionHandler<unknown>>> = new Map()
    private pendingRequests: Map<string | number, PendingRequest<unknown>> =
        new Map()
    private isListening = false

    /**
     * Initialize the global message listener (only once)
     */
    private startListening(): void {
        if (this.isListening) {
            return
        }

        window.addEventListener('message', this.handleMessage.bind(this))
        this.isListening = true
    }

    /**
     * Handle incoming messages from mobile
     * Supports JSON-RPC 2.0 format
     */
    private handleMessage(event: MessageEvent): void {
        try {
            // Parse event.data as JSON
            const data =
                typeof event.data === 'string'
                    ? JSON.parse(event.data)
                    : event.data

            if (!data || typeof data !== 'object') {
                return
            }

            // Handle JSON-RPC 2.0 batch response
            if (isJsonRpcBatchResponse(data)) {
                this.handleBatchResponse(data)
                return
            }

            // Handle JSON-RPC 2.0 single response
            if (isJsonRpcResponse(data)) {
                this.handleJsonRpcResponse(data)
                return
            }

            // Handle JSON-RPC 2.0 notification (for event-based subscriptions)
            if (isJsonRpcNotification(data)) {
                this.handleJsonRpcNotification(data)
            }
        } catch {
            // A malformed message from the page must not break the bridge.
        }
    }

    /**
     * Handle JSON-RPC 2.0 batch response
     */
    private handleBatchResponse(batchResponse: JsonRpcBatchResponse): void {
        batchResponse.forEach(response => {
            this.handleJsonRpcResponse(response)
        })
    }

    /**
     * Handle JSON-RPC 2.0 response (success or error)
     */
    private handleJsonRpcResponse(response: JsonRpcResponse): void {
        const { id } = response

        // Responses with null id are invalid (except for parse errors)
        if (id === null) {
            return
        }

        const pendingRequest = this.pendingRequests.get(id)

        if (!pendingRequest) {
            return
        }

        clearTimeout(pendingRequest.timeoutHandle)
        this.pendingRequests.delete(id)

        // Handle error response
        if ('error' in response) {
            const error = createJsonRpcError(response.error)

            pendingRequest.reject(error)

            return
        }

        // Handle success response
        if ('result' in response) {
            try {
                const parsedResult = this.parsePayload(response.result)

                pendingRequest.resolve(parsedResult as never)
            } catch (error) {
                pendingRequest.reject(
                    error instanceof Error
                        ? error
                        : new Error(
                              `Failed to parse result for method ${pendingRequest.method}`,
                          ),
                )
            }
        }
    }

    /**
     * Handle JSON-RPC 2.0 notification (for event-based subscriptions)
     */
    private handleJsonRpcNotification(notification: {
        method: string
        params?: unknown
    }): void {
        const { method, params } = notification
        const handlers = this.listeners.get(method)

        if (handlers) {
            const parsedParams = this.parsePayload(params)

            handlers.forEach(handler => {
                try {
                    handler(parsedParams)
                } catch (error) {
                    console.error(
                        `Error in handler for method ${method}:`,
                        error,
                    )
                }
            })
        }
    }

    /**
     * Parse payload - handles base64 decoding and JSON parsing
     */
    private parsePayload(payload: unknown): unknown {
        if (typeof payload === 'string') {
            // Try base64 decode first
            try {
                const decoded = window.atob(payload)

                return JSON.parse(decoded)
            } catch {
                // If base64 decode fails, try direct JSON parse
                try {
                    return JSON.parse(payload)
                } catch {
                    // If both fail, return as-is
                    return payload
                }
            }
        }

        // If payload is already an object, return as-is
        return payload
    }

    /**
     * Register a one-time listener for a JSON-RPC response by ID
     * Returns a promise that resolves when the response is received
     */
    waitForResponse<T>(
        id: string | number,
        method: string,
        timeoutMs = 5000,
    ): Promise<T> {
        this.startListening()

        return new Promise<T>((resolve, reject) => {
            // Check if there's already a pending request for this ID
            const existing = this.pendingRequests.get(id)

            if (existing) {
                clearTimeout(existing.timeoutHandle)
                existing.reject(
                    new Error(
                        `New request for ${method} (id: ${id}) cancelled previous request`,
                    ),
                )
            }

            const timeoutHandle = setTimeout(() => {
                this.pendingRequests.delete(id)
                reject(
                    new Error(
                        `Timeout waiting for response from ${method} (id: ${id})`,
                    ),
                )
            }, timeoutMs)

            this.pendingRequests.set(id, {
                resolve: resolve as (value: unknown) => void,
                reject,
                timeoutHandle,
                method,
            })
        })
    }

    /**
     * Register a persistent listener for a specific action/method
     * Useful for event-based subscriptions (e.g., onBackPressed)
     * Works with JSON-RPC 2.0 notifications (method field)
     */
    onAction<T>(action: string, handler: ActionHandler<T>): () => void {
        this.startListening()

        if (!this.listeners.has(action)) {
            this.listeners.set(action, new Set())
        }

        const handlers = this.listeners.get(action)!

        handlers.add(handler as ActionHandler<unknown>)

        // Return unsubscribe function
        return () => {
            handlers.delete(handler as ActionHandler<unknown>)
            if (handlers.size === 0) {
                this.listeners.delete(action)
            }
        }
    }

    /**
     * Remove all listeners and pending requests
     * Useful for cleanup
     */
    cleanup(): void {
        // Reject all pending requests
        this.pendingRequests.forEach(request => {
            clearTimeout(request.timeoutHandle)
            request.reject(new Error('Message listener cleaned up'))
        })
        this.pendingRequests.clear()

        // Clear all listeners
        this.listeners.clear()

        // Remove global listener
        if (this.isListening) {
            window.removeEventListener('message', this.handleMessage.bind(this))
            this.isListening = false
        }
    }
}

const messageListener = new MessageListener()

/**
 * Send a JSON-RPC message to the mobile interface
 * Works for both Android and iOS
 * Uses unified handleRequest function for both single requests/notifications and batch requests
 */
function sendJsonRpcMessage(
    message: JsonRpcRequest | JsonRpcNotification | JsonRpcBatchRequest,
): void {
    const androidInterface = getAndroidInterface()
    const iosInterface = getIosInterface()

    // Always stringify the message (single object or array)
    const stringifiedMessage = JSON.stringify(message)

    // Send to Android interface using handleRequest
    if (androidInterface?.handleRequest) {
        androidInterface.handleRequest(stringifiedMessage)
    }

    // Send to iOS interface using handleRequest.postMessage
    if (iosInterface?.handleRequest?.postMessage) {
        iosInterface.handleRequest.postMessage(stringifiedMessage)
    }
}

/**
 * Call a mobile method that expects a response
 * Sends a JSON-RPC 2.0 request and waits for response via postMessage
 * Returns a promise that resolves when the matching response is received
 */
export function callMobileMethodWithResponse<T>(
    methodName: MobileMethodName,
    timeoutMs = 5000,
    params?: unknown,
): Promise<T> {
    // Generate unique request ID
    const requestId = generateRequestId()

    // Register listener for the response before sending the message
    const responsePromise = messageListener.waitForResponse<T>(
        requestId,
        methodName,
        timeoutMs,
    )

    // Create and send JSON-RPC request
    const request = createRequest(methodName, params, requestId)

    sendJsonRpcMessage(request)

    return responsePromise
}
