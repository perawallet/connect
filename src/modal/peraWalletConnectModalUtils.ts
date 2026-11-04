import { generatePeraWalletConnectDeepLink } from '../util/peraWalletUtils.js'

export interface PeraWalletModalConfig {
    isWebWalletAvailable: boolean
    shouldDisplayNewBadge: boolean
    shouldUseSound: boolean
    promoteMobile?: boolean
    compactMode?: boolean
    singleAccount?: boolean
    selectedAccount?: string
    isInWebview?: boolean
    /**
     * Render the "Connect with Pera Extension" option. Only set when
     * `window.pera` is present; it also sets `is-extension-enabled="true"` on
     * the modal wrapper, which tells the extension not to inject its own row.
     */
    isExtensionEnabled?: boolean
}

// IDs of the light-DOM wrappers each modal is mounted in. The connect modal's
// custom element tag is its wrapper ID without the "-wrapper" suffix.
const PERA_WALLET_CONNECT_MODAL_ID = 'pera-wallet-connect-modal-wrapper'
const PERA_WALLET_REDIRECT_MODAL_ID = 'pera-wallet-redirect-modal-wrapper'
const PERA_WALLET_SIGN_TXN_TOAST_ID = 'pera-wallet-sign-txn-toast-wrapper'

const PERA_WALLET_MODAL_CLASSNAME = 'pera-wallet-modal'

// Dispatched (bubbling, composed) by the connect modal's extension button so
// PeraWalletConnect can call `window.pera.connect()` inside the same click.
const PERA_WALLET_EXTENSION_CONNECT_EVENT = 'pera-wallet-extension-connect'

function createModalWrapperOnDOM(modalId: string) {
    const wrapper = document.createElement('div')

    wrapper.setAttribute('id', modalId)

    document.body.appendChild(wrapper)

    return wrapper
}

// Inside the Pera in-app browser there is no QR to scan: the pairing URI is
// handed straight to the wallet as a deep link.
function openPeraWalletConnectModal(modalConfig: PeraWalletModalConfig) {
    return (uri: string) => {
        const {
            isWebWalletAvailable,
            shouldDisplayNewBadge,
            shouldUseSound,
            compactMode,
            promoteMobile,
            singleAccount,
            selectedAccount,
            isInWebview,
            isExtensionEnabled,
        } = modalConfig

        if (isInWebview) {
            const deepLink = generatePeraWalletConnectDeepLink(uri, {
                singleAccount,
                selectedAccount,
            })

            window.open(deepLink, '_blank')
        } else if (!document.getElementById(PERA_WALLET_CONNECT_MODAL_ID)) {
            const root = createModalWrapperOnDOM(PERA_WALLET_CONNECT_MODAL_ID)
            const newURI = `${uri}&algorand=true`
            const extensionEnabled = String(isExtensionEnabled || false)

            // The extension reads this attribute on the wrapper: "true" means
            // the SDK renders its own extension option and the extension stays
            // out. (`is-web-wallet-avaliable` is misspelt, but the modal reads
            // it under that name.)
            root.setAttribute('is-extension-enabled', extensionEnabled)

            // Built with setAttribute, not innerHTML: `selectedAccount` comes
            // from the dApp and must not be parsed as markup.
            const modal = document.createElement('pera-wallet-connect-modal')
            const attributes = {
                uri: newURI,
                'is-web-wallet-avaliable': String(isWebWalletAvailable),
                'should-display-new-badge': String(shouldDisplayNewBadge),
                'should-use-sound': String(shouldUseSound),
                'compact-mode': String(compactMode),
                'promote-mobile': String(promoteMobile),
                'single-account': String(singleAccount),
                'selected-account': selectedAccount || '',
                'is-in-webview': String(isInWebview || false),
                'is-extension-enabled': extensionEnabled,
            }

            for (const [name, value] of Object.entries(attributes)) {
                modal.setAttribute(name, value)
            }

            root.appendChild(modal)
        }
    }
}

// The `qrcodeModal` WalletConnect drives while pairing: it opens our modal with
// the pairing URI and closes it once the session is established.
function createPeraWalletConnectQrcodeModal(
    modalConfig: PeraWalletModalConfig,
) {
    return {
        open: openPeraWalletConnectModal(modalConfig),
        close: () => removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID),
    }
}

function setupPeraWalletConnectModalCloseListener(
    modalId: string,
    onClose: VoidFunction,
) {
    const peraWalletConnectModalWrapper = document.getElementById(modalId)

    const peraWalletConnectModal = peraWalletConnectModalWrapper
        ?.querySelector(modalId.replace('-wrapper', ''))
        ?.shadowRoot?.querySelector(`.${PERA_WALLET_MODAL_CLASSNAME}`)

    const closeButton = peraWalletConnectModal
        ?.querySelector('pera-wallet-modal-header')
        ?.shadowRoot?.getElementById('pera-wallet-modal-header-close-button')

    closeButton?.addEventListener('click', () => {
        onClose()

        removeModalWrapperFromDOM(modalId)
    })
}

function openPeraWalletRedirectModal() {
    const root = createModalWrapperOnDOM(PERA_WALLET_REDIRECT_MODAL_ID)

    root.innerHTML = '<pera-wallet-redirect-modal></pera-wallet-redirect-modal>'
}

function openPeraWalletSignTxnToast() {
    const root = createModalWrapperOnDOM(PERA_WALLET_SIGN_TXN_TOAST_ID)

    root.innerHTML = '<pera-wallet-sign-txn-toast></pera-wallet-sign-txn-toast>'
}

function closePeraWalletSignTxnToast() {
    removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID)
}

function removeModalWrapperFromDOM(modalId: string) {
    document.getElementById(modalId)?.remove()
}

export {
    PERA_WALLET_CONNECT_MODAL_ID,
    PERA_WALLET_REDIRECT_MODAL_ID,
    PERA_WALLET_SIGN_TXN_TOAST_ID,
    PERA_WALLET_MODAL_CLASSNAME,
    PERA_WALLET_EXTENSION_CONNECT_EVENT,
    openPeraWalletConnectModal,
    createPeraWalletConnectQrcodeModal,
    setupPeraWalletConnectModalCloseListener,
    openPeraWalletRedirectModal,
    openPeraWalletSignTxnToast,
    closePeraWalletSignTxnToast,
    removeModalWrapperFromDOM,
}
