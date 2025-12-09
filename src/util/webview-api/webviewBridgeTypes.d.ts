/**
 * Global type definitions for Pera mobile interfaces
 * Augments the Window interface with platform-specific mobile bridges
 */

declare global {
  interface Window {
    /**
     * Android WebView interface injected by Pera mobile app
     * Available when running in Android WebView
     */
    peraMobileInterface?: PeraMobileAndroidInterface;

    /**
     * iOS WKWebView message handlers injected by Pera mobile app
     * Available when running in iOS WKWebView
     */
    webkit?: {
      messageHandlers?: PeraMobileIosInterface;
    };
  }

  /**
   * Android interface - unified request handler
   * Receives JSON-RPC 2.0 request/notification strings (or batch request arrays as JSON strings)
   * The mobile app should respond with JSON-RPC 2.0 response objects via window.postMessage
   */
  interface PeraMobileAndroidInterface {
    /**
     * Unified method for handling all JSON-RPC 2.0 requests and notifications
     * Receives a JSON string containing either:
     * - A single JSON-RPC request/notification object
     * - An array of JSON-RPC requests/notifications (batch request)
     */
    handleRequest?: (jsonRpcMessage: string) => void;
  }

  /**
   * iOS interface - unified request handler
   * Receives JSON-RPC 2.0 request/notification strings (or batch request arrays as JSON strings)
   * The mobile app should respond with JSON-RPC 2.0 response objects via window.postMessage
   */
  interface PeraMobileIosInterface {
    /**
     * Unified method for handling all JSON-RPC 2.0 requests and notifications
     * Receives a JSON string containing either:
     * - A single JSON-RPC request/notification object
     * - An array of JSON-RPC requests/notifications (batch request)
     */
    handleRequest?: { postMessage: (jsonRpcMessage: string) => void };
  }
}

export {};
