import { test as base, expect, type Page } from '@playwright/test'

const CONFIG_URL = 'https://wc.perawallet.app/config.json'

// Valid checksum, never funded; the e2e wallets only need an address shape.
export const EXTENSION_ACCOUNT =
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'

async function isolateFromNetwork(page: Page) {
    // Nothing leaves the machine: the Pera config is answered locally (no
    // Pera Web, so the QR view is the default) and every other external
    // request, including the WalletConnect bridge and fonts, is dropped.
    await page.route(
        url => url.hostname !== 'localhost',
        route =>
            route.request().url() === CONFIG_URL
                ? route.fulfill({
                      json: {
                          web_wallet: false,
                          servers: ['https://bridge.e2e.invalid'],
                          silent: true,
                      },
                  })
                : route.abort(),
    )
}

export const test = base.extend<{ dapp: Page }>({
    dapp: async ({ page }, use) => {
        await isolateFromNetwork(page)
        await page.goto('/')
        await expect(page.locator('body')).toHaveAttribute('data-ready', 'true')
        await use(page)
    },
})

export { expect }
