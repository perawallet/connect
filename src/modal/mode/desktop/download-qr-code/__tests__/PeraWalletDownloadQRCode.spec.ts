import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'

import { PeraWalletDownloadQRCode } from '../PeraWalletDownloadQRCode.js'
import { PERA_DOWNLOAD_URL } from '../../../../../util/peraWalletConstants.js'

vi.mock('qr-code-styling', () => ({
    default: class {
        private readonly data: string

        constructor(options: { data: string }) {
            this.data = options.data
        }

        append(container: HTMLElement) {
            const qr = document.createElement('div')

            qr.className = 'fake-qr'
            qr.dataset.data = this.data
            container.append(qr)
        }
    },
}))

beforeAll(() => {
    if (!customElements.get('pera-wallet-download-qr-code')) {
        customElements.define(
            'pera-wallet-download-qr-code',
            PeraWalletDownloadQRCode,
        )
    }
})

describe('PeraWalletDownloadQRCode', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('renders a QR code pointing at the Pera download page', () => {
        const element = document.createElement('pera-wallet-download-qr-code')

        document.body.append(element)

        const qrCodes = element
            .shadowRoot!.getElementById('pera-wallet-download-qr-code-wrapper')!
            .querySelectorAll<HTMLElement>('.fake-qr')

        expect(qrCodes).toHaveLength(1)
        expect(qrCodes[0].dataset.data).toBe(PERA_DOWNLOAD_URL)
    })
})
