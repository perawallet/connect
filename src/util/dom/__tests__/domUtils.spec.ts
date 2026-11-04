import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'

import { appTellerManager } from '../../network/teller/appTellerManager.js'
import { PeraWalletConnectError } from '../../PeraWalletConnectError.js'
import {
    escapeHtmlAttribute,
    getMetaInfo,
    getFavicons,
    openDeepLinkInCurrentTab,
    waitForTabOpening,
    WAIT_FOR_TAB_MAX_TRY_COUNT,
    WAIT_FOR_TAB_TRY_INTERVAL,
} from '../domUtils.js'

vi.mock('../../network/teller/appTellerManager.js', () => ({
    appTellerManager: { sendMessage: vi.fn(), setupListener: vi.fn() },
}))

const sendMessageMock = vi.mocked(appTellerManager.sendMessage)
const setupListenerMock = vi.mocked(appTellerManager.setupListener)

const CONNECT_URL = 'https://web.perawallet.app/connect'

function addLink(rel: string, href?: string) {
    const link = document.createElement('link')

    link.setAttribute('rel', rel)
    if (href !== undefined) {
        link.setAttribute('href', href)
    }
    document.head.appendChild(link)
}

function addMeta(name: string, content: string) {
    const meta = document.createElement('meta')

    meta.setAttribute('name', name)
    meta.setAttribute('content', content)
    document.head.appendChild(meta)
}

function stubWindowOpen(tab: Partial<Window> | null) {
    return vi
        .spyOn(window, 'open')
        .mockReturnValue(tab as unknown as Window | null)
}

// Replays a message from the opened tab through the listener the helper registered.
function replyFromTab(type: string) {
    const { onReceiveMessage } = setupListenerMock.mock.calls[0][0]

    onReceiveMessage({
        data: { channel: 'pera-web-wallet', message: { type } },
    } as unknown as MessageEvent<TellerMessage<never>>)
}

describe('domUtils', () => {
    afterEach(() => {
        document.head.innerHTML = ''
        document.body.innerHTML = ''
        document.title = ''
    })

    describe('getFavicons', () => {
        afterEach(() => {
            window.history.replaceState(null, '', '/')
        })

        it('returns absolute http(s) icon hrefs unchanged', () => {
            addLink('icon', 'https://cdn.example.com/icon.png')

            expect(getFavicons()).toContain('https://cdn.example.com/icon.png')
        })

        it('prefixes protocol-relative hrefs with the current protocol', () => {
            addLink('shortcut icon', '//cdn.example.com/icon.png')

            expect(getFavicons()).toContain(
                `${window.location.protocol}//cdn.example.com/icon.png`,
            )
        })

        it('resolves root-relative hrefs against the current origin', () => {
            addLink('icon', '/assets/icon.png')

            expect(getFavicons()).toContain(
                `${window.location.protocol}//${window.location.host}/assets/icon.png`,
            )
        })

        it("resolves document-relative hrefs against the current page's directory", () => {
            window.history.replaceState(null, '', '/dapp/swap/index.html')
            addLink('icon', 'assets/icon.png')

            expect(getFavicons()).toEqual([
                `${window.location.protocol}//${window.location.host}/dapp/swap/assets/icon.png`,
            ])
        })

        it('skips icon links without an href', () => {
            addLink('icon')

            expect(getFavicons()).toEqual([])
        })

        it('ignores non-icon link tags', () => {
            addLink('stylesheet', '/styles.css')

            expect(getFavicons()).toHaveLength(0)
        })
    })

    describe('getMetaInfo', () => {
        it('falls back to the document title and empty description', () => {
            document.title = 'My dApp'

            const info = getMetaInfo()

            expect(info.title).toBe('My dApp')
            expect(info.description).toBe('')
            expect(info.url).toBe(window.location.origin)
        })

        it('prefers the name/description meta tags when present', () => {
            document.title = 'Fallback'
            addMeta('name', 'Meta Title')
            addMeta('description', 'Meta description')

            const info = getMetaInfo()

            expect(info.title).toBe('Meta Title')
            expect(info.description).toBe('Meta description')
        })

        it('reports the first icon as the favicon', () => {
            addLink('icon', 'https://cdn.example.com/first.png')
            addLink('icon', 'https://cdn.example.com/second.png')

            expect(getMetaInfo().favicon).toBe(
                'https://cdn.example.com/first.png',
            )
        })
    })

    describe('openDeepLinkInCurrentTab', () => {
        afterEach(() => {
            window.history.replaceState(null, '', '/')
        })

        it('navigates the current tab instead of opening a new one', () => {
            const open = vi.spyOn(window, 'open')
            // A same-document URL, so jsdom can complete the navigation.
            const url = `${window.location.origin}/#pera-wallet`

            openDeepLinkInCurrentTab(url)

            expect(window.location.href).toBe(url)
            expect(open).not.toHaveBeenCalled()
        })
    })

    describe('waitForTabOpening', () => {
        beforeEach(() => {
            vi.clearAllMocks()
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.clearAllTimers()
            vi.useRealTimers()
            vi.restoreAllMocks()
        })

        it('opens the URL in a new tab and resolves with it once the tab acknowledges', async () => {
            const tab = { closed: false }
            const open = stubWindowOpen(tab)

            const promise = waitForTabOpening(CONNECT_URL)

            replyFromTab('TAB_OPEN_RECEIVED')

            await expect(promise).resolves.toBe(tab)
            expect(open).toHaveBeenCalledWith(CONNECT_URL, '_blank')
        })

        it('only listens to the opened tab on the requested origin', () => {
            const tab = { closed: false }

            stubWindowOpen(tab)

            void waitForTabOpening(CONNECT_URL)

            expect(setupListenerMock).toHaveBeenCalledWith(
                expect.objectContaining({ origin: CONNECT_URL, source: tab }),
            )
        })

        it('pings the tab with TAB_OPEN on every interval until it answers', async () => {
            const tab = { closed: false }

            stubWindowOpen(tab)

            const promise = waitForTabOpening(CONNECT_URL)

            await vi.advanceTimersByTimeAsync(WAIT_FOR_TAB_TRY_INTERVAL * 3)

            expect(sendMessageMock).toHaveBeenCalledTimes(3)
            expect(sendMessageMock).toHaveBeenLastCalledWith({
                message: { type: 'TAB_OPEN' },
                origin: CONNECT_URL,
                targetWindow: tab,
            })

            replyFromTab('TAB_OPEN_RECEIVED')
            await promise
            await vi.advanceTimersByTimeAsync(WAIT_FOR_TAB_TRY_INTERVAL * 3)

            expect(sendMessageMock).toHaveBeenCalledTimes(3)
        })

        it('keeps waiting when the tab sends anything other than the acknowledgement', async () => {
            stubWindowOpen({ closed: false })

            const settled = vi.fn()

            waitForTabOpening(CONNECT_URL).then(settled, settled)
            replyFromTab('IFRAME_INITIALIZED')
            await vi.advanceTimersByTimeAsync(WAIT_FOR_TAB_TRY_INTERVAL * 2)

            expect(settled).not.toHaveBeenCalled()
            expect(sendMessageMock).toHaveBeenCalledTimes(2)
        })

        it('rejects with OPERATION_CANCELLED when the user closes the tab', async () => {
            const tab = { closed: false }

            stubWindowOpen(tab)

            const promise = waitForTabOpening(CONNECT_URL)
            const assertion = expect(promise).rejects.toMatchObject({
                data: { type: 'OPERATION_CANCELLED' },
            })

            await vi.advanceTimersByTimeAsync(WAIT_FOR_TAB_TRY_INTERVAL)
            tab.closed = true
            await vi.advanceTimersByTimeAsync(WAIT_FOR_TAB_TRY_INTERVAL)

            await assertion
            await expect(promise).rejects.toBeInstanceOf(PeraWalletConnectError)
        })

        it('gives up with MESSAGE_NOT_RECEIVED when the tab never answers', async () => {
            stubWindowOpen({ closed: false })

            const promise = waitForTabOpening(CONNECT_URL)
            const assertion = expect(promise).rejects.toMatchObject({
                data: { type: 'MESSAGE_NOT_RECEIVED' },
            })

            await vi.advanceTimersByTimeAsync(
                WAIT_FOR_TAB_TRY_INTERVAL * (WAIT_FOR_TAB_MAX_TRY_COUNT - 1),
            )

            expect(sendMessageMock).toHaveBeenCalledTimes(
                WAIT_FOR_TAB_MAX_TRY_COUNT - 1,
            )

            await vi.advanceTimersByTimeAsync(WAIT_FOR_TAB_TRY_INTERVAL)

            await assertion
        })

        it('never pings and eventually gives up when the popup is blocked', async () => {
            stubWindowOpen(null)

            const promise = waitForTabOpening(CONNECT_URL)
            const assertion = expect(promise).rejects.toMatchObject({
                data: { type: 'MESSAGE_NOT_RECEIVED' },
            })

            await vi.advanceTimersByTimeAsync(
                WAIT_FOR_TAB_TRY_INTERVAL * WAIT_FOR_TAB_MAX_TRY_COUNT,
            )

            await assertion
            expect(sendMessageMock).not.toHaveBeenCalled()
        })

        it('rejects with the error when opening the tab throws', async () => {
            const error = new Error('blocked by sandbox')

            vi.spyOn(window, 'open').mockImplementation(() => {
                throw error
            })

            await expect(waitForTabOpening(CONNECT_URL)).rejects.toBe(error)
        })
    })
})

describe('escapeHtmlAttribute', () => {
    it('escapes everything that could end an attribute or open a tag', () => {
        expect(escapeHtmlAttribute(`a"b'c<d>e&f`)).toBe(
            'a&quot;b&#39;c&lt;d&gt;e&amp;f',
        )
    })
})
