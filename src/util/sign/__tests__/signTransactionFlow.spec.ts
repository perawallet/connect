import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { appTellerManager } from '../../network/teller/appTellerManager.js'
import { waitForTabOpening } from '../../dom/domUtils.js'
import { PeraWalletConnectError } from '../../PeraWalletConnectError.js'
import { type RunSignTransactionFlowParams } from '../signTransactionFlowModels.js'
import { runWebSignTransactionFlow } from '../signTransactionFlow.js'

vi.mock('../../dom/domUtils.js', () => ({
    waitForTabOpening: vi.fn(),
}))

vi.mock('../../network/teller/appTellerManager.js', () => ({
    appTellerManager: { sendMessage: vi.fn(), setupListener: vi.fn() },
}))

const waitForTabOpeningMock = vi.mocked(waitForTabOpening)
const sendMessageMock = vi.mocked(appTellerManager.sendMessage)
const setupListenerMock = vi.mocked(appTellerManager.setupListener)

const TXN_PARAMS = [
    { txn: 'encoded-txn' },
] as unknown as RunSignTransactionFlowParams['signTxnRequestParams']

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

function invoke(overrides: Partial<RunSignTransactionFlowParams> = {}) {
    const resolve = vi.fn()
    const reject = vi.fn()

    runWebSignTransactionFlow({
        method: 'SIGN_TXN',
        signTxnRequestParams: TXN_PARAMS,
        webWalletURL: 'web.perawallet.app',
        resolve,
        reject,
        ...overrides,
    })

    return { resolve, reject }
}

describe('runWebSignTransactionFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.clearAllTimers()
        vi.useRealTimers()
    })

    it('posts a SIGN_TXN message with the transactions', async () => {
        const tab = { closed: false, close: vi.fn() } as unknown as Window

        waitForTabOpeningMock.mockResolvedValue(tab)

        invoke({ method: 'SIGN_TXN' })
        await vi.advanceTimersByTimeAsync(0)

        expect(sendMessageMock).toHaveBeenCalledTimes(1)
        expect(sendMessageMock.mock.calls[0][0].message).toMatchObject({
            type: 'SIGN_TXN',
            txn: TXN_PARAMS,
        })
        expect(setupListenerMock).toHaveBeenCalledTimes(1)
        // Only the opened Pera Web tab may answer.
        expect(setupListenerMock.mock.calls[0][0]).toMatchObject({
            origin: 'https://web.perawallet.app/transaction/sign',
            source: tab,
        })
    })

    it('posts a SIGN_DATA message when signer and chainId are provided', async () => {
        const tab = { closed: false, close: vi.fn() } as unknown as Window

        waitForTabOpeningMock.mockResolvedValue(tab)

        invoke({ method: 'SIGN_DATA', signer: 'ADDR_1', chainId: 416_001 })
        await vi.advanceTimersByTimeAsync(0)

        expect(sendMessageMock.mock.calls[0][0].message).toMatchObject({
            type: 'SIGN_DATA',
            signer: 'ADDR_1',
            chainId: 416_001,
        })
    })

    it('does not post a message for SIGN_DATA without a signer, but still listens', async () => {
        const tab = { closed: false, close: vi.fn() } as unknown as Window

        waitForTabOpeningMock.mockResolvedValue(tab)

        invoke({ method: 'SIGN_DATA' })
        await vi.advanceTimersByTimeAsync(0)

        expect(sendMessageMock).not.toHaveBeenCalled()
        expect(setupListenerMock).toHaveBeenCalledTimes(1)
    })

    it('rejects when opening the tab fails', async () => {
        const error = new Error('tab blocked')

        waitForTabOpeningMock.mockRejectedValue(error)

        const { reject } = invoke()

        await vi.advanceTimersByTimeAsync(0)

        expect(reject).toHaveBeenCalledWith(error)
    })

    it('does not post a request when no tab handle is available, but still listens', async () => {
        waitForTabOpeningMock.mockResolvedValue(null)

        invoke()
        await vi.advanceTimersByTimeAsync(0)

        expect(sendMessageMock).not.toHaveBeenCalled()
        expect(setupListenerMock).toHaveBeenCalledTimes(1)
    })

    it.each(['SIGN_TXN', 'SIGN_DATA'] as const)(
        'rejects %s with a method-scoped cancellation when the user closes the tab',
        async method => {
            const tab = openTab()
            const { reject } = invoke({
                method,
                signer: 'ADDR_1',
                chainId: 416_001,
            })

            await vi.advanceTimersByTimeAsync(0)
            tab.closed = true
            await vi.advanceTimersByTimeAsync(2000)

            expect(reject).toHaveBeenCalledTimes(1)

            const error = reject.mock.calls[0][0] as PeraWalletConnectError

            expect(error).toBeInstanceOf(PeraWalletConnectError)
            expect(error.data.type).toBe(`${method}_CANCELLED`)
        },
    )

    it('keeps waiting while the tab stays open', async () => {
        openTab()
        const { reject, resolve } = invoke()

        await vi.advanceTimersByTimeAsync(10_000)

        expect(reject).not.toHaveBeenCalled()
        expect(resolve).not.toHaveBeenCalled()
    })

    it("resolves with the signed transactions from Pera Web's reply and closes the tab", async () => {
        const tab = openTab()
        const { resolve } = invoke()

        await vi.advanceTimersByTimeAsync(0)
        replyFromPeraWeb({
            type: 'SIGN_TXN_CALLBACK',
            signedTxns: [
                {
                    txnId: 'TXN_1',
                    signedTxn: Buffer.from([1, 2, 3]).toString('base64'),
                },
            ],
        })

        expect(resolve).toHaveBeenCalledWith([new Uint8Array([1, 2, 3])])
        expect(tab.close).toHaveBeenCalled()
    })

    it("rejects with the request's method when Pera Web reports a signing error", async () => {
        openTab()
        const { reject } = invoke({
            method: 'SIGN_DATA',
            signer: 'ADDR_1',
            chainId: 416_001,
        })

        await vi.advanceTimersByTimeAsync(0)
        replyFromPeraWeb({
            type: 'SIGN_DATA_CALLBACK_ERROR',
            error: 'User rejected',
        })

        const error = reject.mock.calls[0][0] as PeraWalletConnectError

        expect(error.data.type).toBe('SIGN_DATA_CANCELLED')
        expect(error.message).toBe('User rejected')
    })
})
