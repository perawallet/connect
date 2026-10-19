import { detectBrowser, isAndroid, isIOS } from './device/deviceUtils.js'
import { PERA_WALLET_APP_DEEP_LINK } from './peraWalletConstants.js'

function generatePeraWalletAppDeepLink(shouldAddBrowserName = true): string {
    let appDeepLink = PERA_WALLET_APP_DEEP_LINK
    const browserName = detectBrowser()

    if (shouldAddBrowserName && browserName) {
        appDeepLink = `${appDeepLink}?browser=${encodeURIComponent(browserName)}`
    }

    return appDeepLink
}

function generatePeraWalletConnectDeepLink(
    uri: string,
    params?: {
        singleAccount?: boolean
        selectedAccount?: string
    },
): string {
    let appDeepLink = generatePeraWalletAppDeepLink(false)

    // iOS registers the WalletConnect handler under its own scheme.
    if (isIOS() && !appDeepLink.includes('-wc')) {
        appDeepLink = appDeepLink.replace('://', '-wc://')
    }

    let deepLink = `${appDeepLink}wc?uri=${encodeURIComponent(uri)}`
    const browserName = detectBrowser()

    if (isAndroid()) {
        deepLink = uri
    }

    if (browserName) {
        deepLink = `${deepLink}&browser=${encodeURIComponent(browserName)}`
    }

    if (params?.singleAccount) {
        deepLink = `${deepLink}&singleAccount=true`
    }

    // Values read back from modal attributes stringify a missing account.
    if (params?.selectedAccount && params.selectedAccount !== 'undefined') {
        deepLink = `${deepLink}&selectedAccount=${params.selectedAccount}`
    }

    return deepLink
}

export { generatePeraWalletAppDeepLink, generatePeraWalletConnectDeepLink }
