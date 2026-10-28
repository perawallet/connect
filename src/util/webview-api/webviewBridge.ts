import {
    type JsonRpcRequest,
    type JsonRpcNotification,
    type JsonRpcResponse,
    type JsonRpcBatchRequest,
    type JsonRpcBatchResponse,
    type JsonRpcError,
    JsonRpcErrorCode,
} from './webviewApiTypes.js'

export type MobileMethodName = 'getPublicSettings'

let requestIdCounter = 0

function generateRequestId(): number {
    const timestamp = Date.now()
    const counter = requestIdCounter++

    // The timestamp prefix makes clashes with another SDK instance's ids
    // unlikely; keeping only 8 digits leaves the id a safe integer.
    const timestampPart = timestamp.toString().slice(-8)
    const counterPart = counter.toString().padStart(4, '0')

    return parseInt(`${timestampPart}${counterPart}`, 10)
}

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

function isJsonRpcBatchResponse(obj: unknown): obj is JsonRpcBatchResponse {
    return Array.isArray(obj) && obj.every(item => isJsonRpcResponse(item))
}

class JsonRpcErrorClass extends Error {
    public readonly code: number
    public readonly data?: unknown

    constructor(error: JsonRpcError) {
        super(error.message)
        this.name = 'JsonRpcError'
        this.code = error.code
        this.data = error.data
    }

    getMessage(): string {
        return `[${this.code}] ${this.message}`
    }
}

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
            return new JsonRpcErrorClass(error)
        }
    }
}

function getAndroidInterface() {
    return window.peraMobileInterface as PeraMobileAndroidInterface | undefined
}

function getIosInterface() {
    return window.webkit?.messageHandlers as PeraMobileIosInterface | undefined
}

interface PendingRequest<T> {
    resolve: (value: T) => void
    reject: (error: Error) => void
    timeoutHandle: ReturnType<typeof setTimeout>
    method: string
}

class MessageListener {
    private pendingRequests: Map<string | number, PendingRequest<unknown>> =
        new Map()
    private isListening = false

    private startListening(): void {
        if (this.isListening) {
            return
        }

        // Added once and kept for the page's lifetime: the listener is shared by
        // every PeraWalletConnect instance through this module.
        window.addEventListener('message', this.handleMessage.bind(this))
        this.isListening = true
    }

    private handleMessage(event: MessageEvent): void {
        try {
            const data =
                typeof event.data === 'string'
                    ? JSON.parse(event.data)
                    : event.data

            if (!data || typeof data !== 'object') {
                return
            }

            if (isJsonRpcBatchResponse(data)) {
                this.handleBatchResponse(data)
                return
            }

            if (isJsonRpcResponse(data)) {
                this.handleJsonRpcResponse(data)
            }
        } catch {
            // A malformed message from the page must not break the bridge.
        }
    }

    private handleBatchResponse(batchResponse: JsonRpcBatchResponse): void {
        batchResponse.forEach(response => {
            this.handleJsonRpcResponse(response)
        })
    }

    private handleJsonRpcResponse(response: JsonRpcResponse): void {
        const { id } = response

        // A null id means the app couldn't read the request's id (e.g. a parse
        // error), so there is no pending request to settle.
        if (id === null) {
            return
        }

        const pendingRequest = this.pendingRequests.get(id)

        if (!pendingRequest) {
            return
        }

        clearTimeout(pendingRequest.timeoutHandle)
        this.pendingRequests.delete(id)

        if ('error' in response) {
            const error = createJsonRpcError(response.error)

            pendingRequest.reject(error)

            return
        }

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

    // Apps may send base64-encoded JSON, plain JSON, or an already-parsed value.
    private parsePayload(payload: unknown): unknown {
        if (typeof payload === 'string') {
            try {
                const decoded = window.atob(payload)

                return JSON.parse(decoded)
            } catch {
                try {
                    return JSON.parse(payload)
                } catch {
                    return payload
                }
            }
        }

        return payload
    }

    waitForResponse<T>(
        id: string | number,
        method: string,
        timeoutMs = 5000,
    ): Promise<T> {
        this.startListening()

        return new Promise<T>((resolve, reject) => {
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
}

const messageListener = new MessageListener()

function sendJsonRpcMessage(
    message: JsonRpcRequest | JsonRpcNotification | JsonRpcBatchRequest,
): void {
    const androidInterface = getAndroidInterface()
    const iosInterface = getIosInterface()

    const stringifiedMessage = JSON.stringify(message)

    if (androidInterface?.handleRequest) {
        androidInterface.handleRequest(stringifiedMessage)
    }

    if (iosInterface?.handleRequest?.postMessage) {
        iosInterface.handleRequest.postMessage(stringifiedMessage)
    }
}

export function callMobileMethodWithResponse<T>(
    methodName: MobileMethodName,
    timeoutMs = 5000,
    params?: unknown,
): Promise<T> {
    const requestId = generateRequestId()

    // Register before sending so a fast reply can't beat its listener.
    const responsePromise = messageListener.waitForResponse<T>(
        requestId,
        methodName,
        timeoutMs,
    )

    const request = createRequest(methodName, params, requestId)

    sendJsonRpcMessage(request)

    return responsePromise
}
