import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import algosdk from 'algosdk'

import { appTellerManager } from '../../network/teller/appTellerManager.js'
import { waitForTabOpening } from '../../dom/domUtils.js'
import { removeModalWrapperFromDOM } from '../../../modal/peraWalletConnectModalUtils.js'
import { PeraWalletConnectError } from '../../PeraWalletConnectError.js'
import { resetWalletDetailsFromStorage } from '../../storage/storageUtils.js'
import { runWebConnectFlow } from '../connectFlow.js'

vi.mock('../../dom/domUtils.js', () => ({
    waitForTabOpening: vi.fn(),
    getMetaInfo: vi.fn(() => ({
        title: 'dApp',
        description: 'desc',
        url: 'https://dapp.example.com',
        favicon: 'https://dapp.example.com/favicon.ico',
    })),
}))

vi.mock('../../network/teller/appTellerManager.js', () => ({
    appTellerManager: { sendMessage: vi.fn(), setupListener: vi.fn() },
}))

vi.mock('../../../modal/peraWalletConnectModalUtils.js', () => ({
    PERA_WALLET_CONNECT_MODAL_ID: 'pera-wallet-connect-modal',
    removeModalWrapperFromDOM: vi.fn(),
}))

const waitForTabOpeningMock = vi.mocked(waitForTabOpening)
const sendMessageMock = vi.mocked(appTellerManager.sendMessage)
const setupListenerMock = vi.mocked(appTellerManager.setupListener)
const removeModalMock = vi.mocked(removeModalWrapperFromDOM)

function openTab() {
    const tab = { closed: false, close: vi.fn() }

    waitForTabOpeningMock.mockResolvedValue(tab as unknown as Window)

    return tab
}

// Replays a message from Pera Web through the listener the flow registered.
function replyFromPeraWeb(message: unknown) {
    const { onReceiveMessage } = setupListenerMock.mock.calls[0][0]

    onReceiveMessage({
        data: { channel: 'pera-web-wallet', message },
    } as MessageEvent<TellerMessage<never>>)
}

function invoke(
    overrides: Partial<Parameters<typeof runWebConnectFlow>[0]> = {},
) {
    const resolve = vi.fn()
    const reject = vi.fn()

    const run = runWebConnectFlow({
        webWalletURL: 'web.perawallet.app',
        chainId: 416_001,
        resolve,
        reject,
        ...overrides,
    })

    return { run, resolve, reject }
}

describe('runWebConnectFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(async () => {
        vi.clearAllTimers()
        vi.useRealTimers()
        await resetWalletDetailsFromStorage()
    })

    it('opens the connect tab, posts a CONNECT message, and wires the listener', async () => {
        const tab = { closed: false, close: vi.fn() } as unknown as Window

        waitForTabOpeningMock.mockResolvedValue(tab)

        const { run } = invoke()

        await run()

        expect(sendMessageMock).toHaveBeenCalledTimes(1)

        const sent = sendMessageMock.mock.calls[0][0]

        expect(sent.message).toMatchObject({
            type: 'CONNECT',
            data: { chainId: 416_001 },
        })
        expect(sent.targetWindow).toBe(tab)
        expect(setupListenerMock).toHaveBeenCalledTimes(1)
        // Only the opened Pera Web tab may answer.
        expect(setupListenerMock.mock.calls[0][0]).toMatchObject({
            origin: 'https://web.perawallet.app/connect',
            source: tab,
        })
    })

    it('still sets up the listener when no tab is returned', async () => {
        waitForTabOpeningMock.mockResolvedValue(null)

        const { run } = invoke()

        await run()

        expect(sendMessageMock).not.toHaveBeenCalled()
        expect(setupListenerMock).toHaveBeenCalledTimes(1)
    })

    it('tears down the modal and rejects when opening the tab fails', async () => {
        const error = new Error('tab blocked')

        waitForTabOpeningMock.mockRejectedValue(error)

        const { run, reject } = invoke()

        await run()

        expect(removeModalMock).toHaveBeenCalledWith(
            'pera-wallet-connect-modal',
        )
        expect(reject).toHaveBeenCalledWith(error)
    })

    it('rejects with CONNECT_CANCELLED and removes the modal when the user closes the tab', async () => {
        const tab = openTab()
        const { run, reject } = invoke()

        await run()
        tab.closed = true
        await vi.advanceTimersByTimeAsync(2000)

        expect(reject).toHaveBeenCalledTimes(1)

        const error = reject.mock.calls[0][0] as PeraWalletConnectError

        expect(error).toBeInstanceOf(PeraWalletConnectError)
        expect(error.data.type).toBe('CONNECT_CANCELLED')
        expect(removeModalMock).toHaveBeenCalledWith(
            'pera-wallet-connect-modal',
        )
    })

    it('keeps waiting while the tab stays open', async () => {
        openTab()
        const { run, reject, resolve } = invoke()

        await run()
        await vi.advanceTimersByTimeAsync(10_000)

        expect(reject).not.toHaveBeenCalled()
        expect(resolve).not.toHaveBeenCalled()
        expect(removeModalMock).not.toHaveBeenCalled()
    })

    it('never reports a cancellation when no tab handle is available', async () => {
        waitForTabOpeningMock.mockResolvedValue(null)

        const { run, reject } = invoke()

        await run()
        await vi.advanceTimersByTimeAsync(10_000)

        expect(reject).not.toHaveBeenCalled()
    })

    it("resolves with the accounts from Pera Web's connect callback and closes the tab", async () => {
        const tab = openTab()
        const address = algosdk.generateAccount().addr.toString()
        const { run, resolve } = invoke()

        await run()
        replyFromPeraWeb({
            type: 'CONNECT_CALLBACK',
            data: { addresses: [address] },
        })

        expect(resolve).toHaveBeenCalledWith([address])
        expect(tab.close).toHaveBeenCalled()
    })

    it("rejects with Pera Web's network mismatch", async () => {
        openTab()
        const { run, reject, resolve } = invoke()

        await run()
        replyFromPeraWeb({
            type: 'CONNECT_NETWORK_MISMATCH',
            error: 'Pera Web is on TestNet',
        })

        expect(resolve).not.toHaveBeenCalled()
        expect(reject).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Pera Web is on TestNet',
                data: expect.objectContaining({
                    type: 'CONNECT_NETWORK_MISMATCH',
                }),
            }),
        )
    })
})
