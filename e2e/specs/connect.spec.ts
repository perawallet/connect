import jsQR from 'jsqr'
import { PNG } from 'pngjs'

import { EXTENSION_ACCOUNT, expect, test } from './fixtures'

function decodeQrCode(png: Buffer) {
    const image = PNG.sync.read(png)

    return jsQR(new Uint8ClampedArray(image.data), image.width, image.height)
        ?.data
}

test.describe('connect()', () => {
    test('renders the WalletConnect pairing URI as a scannable QR code', async ({
        dapp,
    }) => {
        await dapp.evaluate(() => {
            void new window.PeraWalletConnect().connect().catch(() => {})
        })

        const uri = await dapp
            .locator('pera-wallet-connect-modal')
            .getAttribute('uri')
        const qrCode = dapp.locator(
            '#pera-wallet-connect-modal-connect-qr-code',
        )

        await expect(qrCode.locator('svg')).toBeVisible()
        expect(uri).toMatch(/^wc:.+@1\?bridge=.+&key=.+&algorand=true$/)
        expect(decodeQrCode(await qrCode.screenshot())).toBe(uri)
    })

    test('rejects with CONNECT_MODAL_CLOSED when the user closes the modal', async ({
        dapp,
    }) => {
        const outcome = dapp.evaluate(() =>
            new window.PeraWalletConnect().connect().then(
                accounts => ({ accounts }),
                (error: { data?: { type?: string } }) => ({
                    type: error.data?.type,
                }),
            ),
        )

        await dapp.locator('#pera-wallet-modal-header-close-button').click()

        expect(await outcome).toEqual({ type: 'CONNECT_MODAL_CLOSED' })
        await expect(
            dapp.locator('#pera-wallet-connect-modal-wrapper'),
        ).toHaveCount(0)
    })

    test('connects through the extension inside the user’s click', async ({
        dapp,
    }) => {
        await dapp.evaluate(account => {
            // Like the real extension, a first-time connect needs transient
            // user activation, which a real browser only grants inside the
            // click; awaiting anything before calling it would lose it.
            const provider = Object.freeze({
                version: '1',
                connect: () =>
                    navigator.userActivation.isActive
                        ? Promise.resolve({
                              accounts: [{ address: account, name: 'E2E' }],
                              network: 'testnet',
                          })
                        : Promise.reject(
                              Object.assign(new Error('no user activation'), {
                                  name: 'PeraProviderError',
                                  code: 4100,
                              }),
                          ),
                disconnect: () => Promise.resolve(),
                getAddresses: () => Promise.resolve([]),
                signTransactions: () => Promise.reject(new Error('unused')),
                signData: () => Promise.reject(new Error('unused')),
                on: () => () => {},
            })

            Object.defineProperty(window, 'pera', { value: provider })
        }, EXTENSION_ACCOUNT)

        const outcome = dapp.evaluate(() => {
            const pera = new window.PeraWalletConnect()

            return pera.connect().then(accounts => ({
                accounts,
                platform: pera.platform,
            }))
        })

        await dapp
            .locator('#pera-wallet-connect-extension-launch-button')
            .click()

        expect(await outcome).toEqual({
            accounts: [EXTENSION_ACCOUNT],
            platform: 'extension',
        })
    })
})
