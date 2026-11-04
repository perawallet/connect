// jsdom can't draw either library's canvas/SVG output. The QR fake renders a
// placeholder carrying the encoded data, so a test can read back what the
// user would scan.

export const QR_CODE_DATA_ATTRIBUTE = 'data-qr-code-data'

interface QRCodeOptions {
    data?: string
}

export class FakeQRCodeStyling {
    private readonly data: string

    constructor(options: QRCodeOptions = {}) {
        this.data = options.data ?? ''
    }

    append(container: HTMLElement) {
        const placeholder = document.createElement('div')

        placeholder.setAttribute(QR_CODE_DATA_ATTRIBUTE, this.data)
        container.appendChild(placeholder)
    }
}

export const fakeLottie = {
    loadAnimation: () => ({ destroy: () => undefined }),
}
