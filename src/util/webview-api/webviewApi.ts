import { callMobileMethodWithResponse } from './webviewBridge.js'
import type { PublicSettings } from './webviewApiTypes.js'

const DEFAULT_TIMEOUT = 2000

export function getPublicSettings(
    timeoutMs = DEFAULT_TIMEOUT,
): Promise<PublicSettings | null> {
    return callMobileMethodWithResponse<PublicSettings | null>(
        'getPublicSettings',
        timeoutMs,
    )
}
