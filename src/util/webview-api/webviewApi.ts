import { callMobileMethodWithResponse } from './webviewBridge'
import type { PublicSettings } from './webviewApiTypes'

const DEFAULT_TIMEOUT = 2000

export function getPublicSettings(
    timeoutMs = DEFAULT_TIMEOUT,
): Promise<PublicSettings | null> {
    return callMobileMethodWithResponse<PublicSettings | null>(
        'getPublicSettings',
        timeoutMs,
    )
}
