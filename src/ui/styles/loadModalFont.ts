const MODAL_FONT_STYLESHEET_ID = 'pera-wallet-connect-font'
const MODAL_FONT_STYLESHEET_URL =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'

// Browsers ignore @font-face inside a shadow root, so the modal's font has to
// be loaded from the document even though every component styles itself in
// its own shadow DOM.
function loadModalFont() {
    if (document.getElementById(MODAL_FONT_STYLESHEET_ID)) {
        return
    }

    const link = document.createElement('link')

    link.id = MODAL_FONT_STYLESHEET_ID
    link.rel = 'stylesheet'
    link.href = MODAL_FONT_STYLESHEET_URL

    document.head.appendChild(link)
}

export { loadModalFont }
