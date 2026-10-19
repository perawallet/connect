import { PeraWalletModalHeader } from './modal/header/PeraWalletModalHeader'
import { PeraWalletDownloadQRCode } from './modal/mode/desktop/download-qr-code/PeraWalletDownloadQRCode'
import { PeraWalletModalDesktopMode } from './modal/mode/desktop/PeraWalletConnectModalDesktopMode'
import { PeraWalletModalTouchScreenMode } from './modal/mode/touch-screen/PeraWalletModalTouchScreenMode'
import { PeraWalletConnectModal } from './modal/PeraWalletConnectModal'
import { PeraWalletRedirectModal } from './modal/redirect/PeraWalletRedirectModal'
import { PeraWalletConnectModalInformationSection } from './modal/section/information/PeraWalletConnectModalInformationSection'
import { PeraWalletConnectModalPendingMessageSection } from './modal/section/pending-message/PeraWalletConnectModalPendingMessage'
import { PeraWalletSignTxnToast } from './modal/sign-toast/PeraWalletSignTxnToast'
import { loadModalFont } from './ui/styles/loadModalFont'
import { setupDynamicVhValue } from './util/screen/screenSizeUtils'

const CUSTOM_ELEMENTS: Record<string, CustomElementConstructor> = {
    'pera-wallet-connect-modal': PeraWalletConnectModal,
    'pera-wallet-modal-desktop-mode': PeraWalletModalDesktopMode,
    'pera-wallet-modal-header': PeraWalletModalHeader,
    'pera-wallet-modal-touch-screen-mode': PeraWalletModalTouchScreenMode,
    'pera-wallet-redirect-modal': PeraWalletRedirectModal,
    'pera-wallet-connect-modal-information-section':
        PeraWalletConnectModalInformationSection,
    'pera-wallet-connect-modal-pending-message-section':
        PeraWalletConnectModalPendingMessageSection,
    'pera-wallet-sign-txn-toast': PeraWalletSignTxnToast,
    'pera-wallet-download-qr-code': PeraWalletDownloadQRCode,
}

for (const [name, element] of Object.entries(CUSTOM_ELEMENTS)) {
    // Another copy of the SDK on the page may have registered them already.
    if (!window.customElements.get(name)) {
        window.customElements.define(name, element)
    }
}

loadModalFont()
setupDynamicVhValue()
