import { readFileSync } from 'node:fs'

import { expect, test } from './fixtures'

const { version } = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string }

test('the bundled package registers its modal elements and legacy globals', async ({
    dapp,
}) => {
    const state = await dapp.evaluate(async () => {
        await customElements.whenDefined('pera-wallet-connect-modal')

        return {
            elements: [
                'pera-wallet-connect-modal',
                'pera-wallet-modal-header',
                'pera-wallet-modal-desktop-mode',
                'pera-wallet-redirect-modal',
                'pera-wallet-sign-txn-toast',
            ].map(name => !!customElements.get(name)),
            hasBuffer: typeof (window as { Buffer?: unknown }).Buffer,
            hasGlobal:
                (window as unknown as { global?: unknown }).global === window,
            fontLinks: document.querySelectorAll(
                'link#pera-wallet-connect-font',
            ).length,
        }
    })

    expect(state).toEqual({
        elements: [true, true, true, true, true],
        hasBuffer: 'function',
        hasGlobal: true,
        fontLinks: 1,
    })
})

test('a fresh instance reports no session', async ({ dapp }) => {
    const state = await dapp.evaluate(async () => {
        const pera = new window.PeraWalletConnect()

        return {
            isConnected: pera.isConnected,
            platform: pera.platform,
            accounts: await pera.reconnectSession(),
        }
    })

    expect(state).toEqual({ isConnected: false, platform: null, accounts: [] })
})

test('the connect modal shows the package version', async ({ dapp }) => {
    await dapp.evaluate(() => {
        void new window.PeraWalletConnect().connect().catch(() => {})
    })

    await expect(
        dapp.locator('.pera-wallet-modal-header__version-number'),
    ).toHaveText(`v${version}`)
})
