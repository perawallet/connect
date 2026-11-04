import { QR_CODE_DATA_ATTRIBUTE } from './fakeRendering.js'

// Reads the SDK's UI the way a user meets it: the light-DOM wrappers the SDK
// mounts on <body> and the custom elements' open shadow roots. The wrapper IDs
// are relied on by dApps and by the Pera extension, so they are spelled out.

const CONNECT_MODAL_WRAPPER_ID = 'pera-wallet-connect-modal-wrapper'
const REDIRECT_MODAL_WRAPPER_ID = 'pera-wallet-redirect-modal-wrapper'
const SIGN_TXN_TOAST_WRAPPER_ID = 'pera-wallet-sign-txn-toast-wrapper'

function getConnectModalWrapper() {
    return document.getElementById(CONNECT_MODAL_WRAPPER_ID)
}

function getConnectModal() {
    return (
        getConnectModalWrapper()?.querySelector<HTMLElement>(
            'pera-wallet-connect-modal',
        ) ?? null
    )
}

function requireConnectModal() {
    const modal = getConnectModal()

    if (!modal?.shadowRoot) {
        throw new Error('The connect modal is not on the page')
    }

    return modal.shadowRoot
}

/** The pairing URI the modal was opened with (what the QR code encodes). */
function getConnectModalUri() {
    const uri = getConnectModal()?.getAttribute('uri')

    if (!uri) {
        throw new Error('The connect modal has no pairing URI')
    }

    return uri
}

function getDesktopModeRoot() {
    const desktopMode = requireConnectModal().querySelector(
        'pera-wallet-modal-desktop-mode',
    )

    if (!desktopMode?.shadowRoot) {
        throw new Error('The connect modal is not in desktop mode')
    }

    return desktopMode.shadowRoot
}

function getTouchScreenModeRoot() {
    const touchMode = requireConnectModal().querySelector(
        'pera-wallet-modal-touch-screen-mode',
    )

    if (!touchMode?.shadowRoot) {
        throw new Error('The connect modal is not in touch-screen mode')
    }

    return touchMode.shadowRoot
}

/** Connect options in the order the desktop modal lists them. */
function getConnectOptionIds() {
    return Array.from(
        getDesktopModeRoot().querySelectorAll('.pera-wallet-accordion-item'),
    ).map(option => option.id)
}

function getSelectedConnectOptionId() {
    return (
        getDesktopModeRoot().querySelector(
            '.pera-wallet-accordion-item.pera-wallet-accordion-item--active',
        )?.id ?? null
    )
}

function getRenderedQrCodeData() {
    return (
        getDesktopModeRoot()
            .getElementById('pera-wallet-connect-modal-connect-qr-code')
            ?.querySelector(`[${QR_CODE_DATA_ATTRIBUTE}]`)
            ?.getAttribute(QR_CODE_DATA_ATTRIBUTE) ?? null
    )
}

function requireButton(root: ShadowRoot, id: string) {
    const button = root.getElementById(id)

    if (!button) {
        throw new Error(`#${id} is not rendered`)
    }

    return button
}

function getExtensionConnectButton() {
    return requireButton(
        getDesktopModeRoot(),
        'pera-wallet-connect-extension-launch-button',
    )
}

function getConnectModalCloseButton() {
    const header = requireConnectModal().querySelector(
        'pera-wallet-modal-header',
    )

    if (!header?.shadowRoot) {
        throw new Error('The connect modal has no header')
    }

    return requireButton(
        header.shadowRoot,
        'pera-wallet-modal-header-close-button',
    )
}

function getLaunchPeraWalletLink() {
    return requireButton(
        getTouchScreenModeRoot(),
        'pera-wallet-connect-modal-touch-screen-mode-launch-pera-wallet-button',
    )
}

function getSignTxnToast() {
    return (
        document
            .getElementById(SIGN_TXN_TOAST_WRAPPER_ID)
            ?.querySelector('pera-wallet-sign-txn-toast') ?? null
    )
}

function getRedirectModal() {
    return (
        document
            .getElementById(REDIRECT_MODAL_WRAPPER_ID)
            ?.querySelector('pera-wallet-redirect-modal') ?? null
    )
}

export {
    getConnectModal,
    getConnectModalCloseButton,
    getConnectModalUri,
    getConnectModalWrapper,
    getConnectOptionIds,
    getExtensionConnectButton,
    getLaunchPeraWalletLink,
    getRedirectModal,
    getRenderedQrCodeData,
    getSelectedConnectOptionId,
    getSignTxnToast,
}
