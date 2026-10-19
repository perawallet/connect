import {
    PERA_PROVIDER_ERROR_CODES,
    isPeraProviderError,
} from './peraProviderTypes.js'
import { PeraWalletConnectError } from '../../util/PeraWalletConnectError.js'

/**
 * Kept apart from `mapProviderError`: `PeraWalletConnect.getEmptySignatures()`
 * documents its own error contract (timeout type, `detail.reason`) for every
 * transport.
 */
export function mapEmptySignaturesError(
    error: unknown,
): PeraWalletConnectError {
    const message =
        (error as Error)?.message || 'Failed to get empty signatures'

    if (isPeraProviderError(error)) {
        switch (error.code) {
            case PERA_PROVIDER_ERROR_CODES.UNAUTHORIZED: {
                return new PeraWalletConnectError(
                    { type: 'SESSION_DISCONNECTED', detail: error },
                    message,
                )
            }
            case PERA_PROVIDER_ERROR_CODES.NETWORK_NOT_SUPPORTED: {
                return new PeraWalletConnectError(
                    {
                        type: 'EMPTY_SIGNATURES_NETWORK_MISMATCH',
                        detail: error,
                    },
                    message,
                )
            }
            case PERA_PROVIDER_ERROR_CODES.TIMED_OUT: {
                return new PeraWalletConnectError(
                    { type: 'EMPTY_SIGNATURES_TIMEOUT', detail: error },
                    message,
                )
            }
            default: {
                break
            }
        }
    }

    return new PeraWalletConnectError(
        { type: 'EMPTY_SIGNATURES', detail: { reason: 'wallet-error', error } },
        message,
    )
}
