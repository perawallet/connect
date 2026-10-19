// Errors reaching the SDK come from WalletConnect, the extension, fetch or a
// dApp callback, so nothing guarantees an Error instance or a message.
function getErrorMessage(error: unknown, fallback: string): string {
    if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message
    ) {
        return error.message
    }

    return fallback
}

export { getErrorMessage }
