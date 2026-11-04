// Replaced at build time with the package version (see vite.config.ts).
declare const PERA_CONNECT_VERSION: string

interface Window {
    // Set by connect() while Pera Web is offered; the connect modal's Pera Web
    // button calls it.
    onWebWalletConnect?: () => Promise<void>
    global?: Window
    Buffer?: unknown
}
