/**
 * Webview API Implementation
 * Pera Connect WebView API functions
 */
import { callMobileMethodWithResponse } from "./webviewBridge";
import type { PublicSettings } from "./webviewApiTypes";

const DEFAULT_TIMEOUT = 2000;

/**
 * Get public settings
 * Returns privacy-safe subset of settings (for Pera Connect)
 */
export function getPublicSettings(timeoutMs = DEFAULT_TIMEOUT): Promise<PublicSettings | null> {
  return callMobileMethodWithResponse<PublicSettings | null>("getPublicSettings", timeoutMs);
}
