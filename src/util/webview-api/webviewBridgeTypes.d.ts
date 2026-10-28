declare global {
    interface Window {
        /** Injected by the Pera Android app's WebView. */
        peraMobileInterface?: PeraMobileAndroidInterface

        /** Injected by the Pera iOS app's WKWebView. */
        webkit?: {
            messageHandlers?: PeraMobileIosInterface
        }
    }

    /** The app replies with JSON-RPC 2.0 responses via `window.postMessage`. */
    interface PeraMobileAndroidInterface {
        /** Takes a JSON-encoded JSON-RPC request, notification, or batch array. */
        handleRequest?: (jsonRpcMessage: string) => void
    }

    /** The app replies with JSON-RPC 2.0 responses via `window.postMessage`. */
    interface PeraMobileIosInterface {
        /** Takes a JSON-encoded JSON-RPC request, notification, or batch array. */
        handleRequest?: { postMessage: (jsonRpcMessage: string) => void }
    }
}

export {}
