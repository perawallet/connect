import { describe, it, expect, vi, afterEach } from 'vitest'

import { callMobileMethodWithResponse } from '../webviewBridge.js'

type MutableWindow = typeof window & {
    peraMobileInterface?: { handleRequest?: (message: string) => void }
    webkit?: {
        messageHandlers?: {
            handleRequest?: { postMessage: (message: string) => void }
        }
    }
}

const testWindow = window as MutableWindow

function setAndroidInterface() {
    const handleRequest = vi.fn()

    testWindow.peraMobileInterface = { handleRequest }

    return handleRequest
}

function setIosInterface() {
    const postMessage = vi.fn()

    testWindow.webkit = { messageHandlers: { handleRequest: { postMessage } } }

    return postMessage
}

function respond(data: unknown) {
    window.dispatchEvent(new MessageEvent('message', { data }))
}

function sentRequestId(handleRequest: ReturnType<typeof vi.fn>, call = 0) {
    return JSON.parse(handleRequest.mock.calls[call][0] as string).id as number
}

describe('webviewBridge', () => {
    afterEach(() => {
        delete testWindow.peraMobileInterface
        delete testWindow.webkit
        vi.restoreAllMocks()
        vi.useRealTimers()
    })

    describe('callMobileMethodWithResponse', () => {
        it('sends a JSON-RPC 2.0 request through the Android interface', () => {
            const handleRequest = setAndroidInterface()

            callMobileMethodWithResponse('getPublicSettings', 5000, {
                foo: 'bar',
            })

            expect(handleRequest).toHaveBeenCalledTimes(1)

            const sent = JSON.parse(handleRequest.mock.calls[0][0])

            expect(sent).toMatchObject({
                jsonrpc: '2.0',
                method: 'getPublicSettings',
                params: { foo: 'bar' },
            })
            expect(typeof sent.id).toBe('number')
        })

        it('sends the request through the iOS message handler', () => {
            const postMessage = setIosInterface()

            void callMobileMethodWithResponse('getPublicSettings', 5000)

            expect(postMessage).toHaveBeenCalledTimes(1)
            expect(JSON.parse(postMessage.mock.calls[0][0])).toMatchObject({
                jsonrpc: '2.0',
                method: 'getPublicSettings',
            })
        })

        it('resolves with an object result matched by request id', async () => {
            const handleRequest = setAndroidInterface()
            const promise = callMobileMethodWithResponse<{ theme: string }>(
                'getPublicSettings',
            )
            const { id } = JSON.parse(handleRequest.mock.calls[0][0])

            respond({ jsonrpc: '2.0', id, result: { theme: 'dark' } })

            await expect(promise).resolves.toEqual({ theme: 'dark' })
        })

        it('decodes a base64-encoded JSON result', async () => {
            const handleRequest = setAndroidInterface()
            const promise = callMobileMethodWithResponse<{ network: string }>(
                'getPublicSettings',
            )
            const { id } = JSON.parse(handleRequest.mock.calls[0][0])

            const encoded = window.btoa(JSON.stringify({ network: 'mainnet' }))

            // Responses can arrive as a JSON string too, exercising the parse branch.
            respond(JSON.stringify({ jsonrpc: '2.0', id, result: encoded }))

            await expect(promise).resolves.toEqual({ network: 'mainnet' })
        })

        it('rejects with a JSON-RPC error response', async () => {
            const handleRequest = setAndroidInterface()
            const promise = callMobileMethodWithResponse('getPublicSettings')
            const { id } = JSON.parse(handleRequest.mock.calls[0][0])

            respond({
                jsonrpc: '2.0',
                id,
                error: { code: -32_601, message: 'Method not found' },
            })

            await expect(promise).rejects.toMatchObject({
                name: 'JsonRpcError',
                code: -32_601,
            })
        })

        it('rejects after the timeout when no response arrives', async () => {
            vi.useFakeTimers()
            setAndroidInterface()

            const promise = callMobileMethodWithResponse(
                'getPublicSettings',
                1000,
            )
            const assertion = expect(promise).rejects.toThrow(
                /Timeout waiting for response/,
            )

            await vi.advanceTimersByTimeAsync(1000)
            await assertion
        })

        it('ignores responses whose id does not match a pending request', async () => {
            vi.useFakeTimers()
            const handleRequest = setAndroidInterface()

            const promise = callMobileMethodWithResponse(
                'getPublicSettings',
                1000,
            )
            const { id } = JSON.parse(handleRequest.mock.calls[0][0])

            // Wrong id -> should be dropped, and the request should still time out.
            respond({
                jsonrpc: '2.0',
                id: id + 999,
                result: { theme: 'light' },
            })

            const assertion = expect(promise).rejects.toThrow(/Timeout/)

            await vi.advanceTimersByTimeAsync(1000)
            await assertion
        })

        it('gives each request its own id so replies reach the right caller', async () => {
            const handleRequest = setAndroidInterface()
            const first = callMobileMethodWithResponse('getPublicSettings')
            const second = callMobileMethodWithResponse('getPublicSettings')
            const firstId = sentRequestId(handleRequest, 0)
            const secondId = sentRequestId(handleRequest, 1)

            respond({ jsonrpc: '2.0', id: secondId, result: 'second' })
            respond({ jsonrpc: '2.0', id: firstId, result: 'first' })

            expect(firstId).not.toBe(secondId)
            await expect(first).resolves.toBe('first')
            await expect(second).resolves.toBe('second')
        })

        it('omits params from the request when none are given', () => {
            const handleRequest = setAndroidInterface()

            void callMobileMethodWithResponse('getPublicSettings', 5000).catch(
                () => undefined,
            )

            expect(
                JSON.parse(handleRequest.mock.calls[0][0]),
            ).not.toHaveProperty('params')
        })

        it('still waits for a reply when no app interface is injected', async () => {
            vi.useFakeTimers()

            const promise = callMobileMethodWithResponse(
                'getPublicSettings',
                1000,
            )
            const assertion = expect(promise).rejects.toThrow(/Timeout/)

            await vi.advanceTimersByTimeAsync(1000)
            await assertion
        })
    })

    describe('result payloads', () => {
        it('parses a plain JSON string result', async () => {
            const handleRequest = setAndroidInterface()
            const promise = callMobileMethodWithResponse('getPublicSettings')

            respond({
                jsonrpc: '2.0',
                id: sentRequestId(handleRequest),
                result: JSON.stringify({ theme: 'light' }),
            })

            await expect(promise).resolves.toEqual({ theme: 'light' })
        })

        it('returns a string result that is neither base64 nor JSON as is', async () => {
            const handleRequest = setAndroidInterface()
            const promise = callMobileMethodWithResponse('getPublicSettings')

            respond({
                jsonrpc: '2.0',
                id: sentRequestId(handleRequest),
                result: 'not json!',
            })

            await expect(promise).resolves.toBe('not json!')
        })

        it('resolves with a null result', async () => {
            const handleRequest = setAndroidInterface()
            const promise = callMobileMethodWithResponse('getPublicSettings')

            respond({
                jsonrpc: '2.0',
                id: sentRequestId(handleRequest),
                result: null,
            })

            await expect(promise).resolves.toBeNull()
        })
    })

    describe('error responses', () => {
        it.each([
            [-32_700, 'Parse error'],
            [-32_600, 'Invalid Request'],
            [-32_602, 'Invalid params'],
            [-32_603, 'Internal error'],
        ])(
            'rejects code %i with the standard message %s',
            async (code, message) => {
                const handleRequest = setAndroidInterface()
                const promise =
                    callMobileMethodWithResponse('getPublicSettings')

                respond({
                    jsonrpc: '2.0',
                    id: sentRequestId(handleRequest),
                    error: { code, message: 'app text', data: { hint: 1 } },
                })

                await expect(promise).rejects.toMatchObject({
                    name: 'JsonRpcError',
                    code,
                    message,
                    data: { hint: 1 },
                })
            },
        )

        it("keeps the app's message for method-not-found, with a default when it sends none", async () => {
            const handleRequest = setAndroidInterface()
            const custom = callMobileMethodWithResponse('getPublicSettings')
            const empty = callMobileMethodWithResponse('getPublicSettings')

            respond({
                jsonrpc: '2.0',
                id: sentRequestId(handleRequest, 0),
                error: { code: -32_601, message: 'getPublicSettings missing' },
            })
            respond({
                jsonrpc: '2.0',
                id: sentRequestId(handleRequest, 1),
                error: { code: -32_601, message: '' },
            })

            await expect(custom).rejects.toThrow('getPublicSettings missing')
            await expect(empty).rejects.toThrow('Method not found')
        })

        it.each([-32_000, -32_050, 4001])(
            "passes through the app's own error %i unchanged",
            async code => {
                const handleRequest = setAndroidInterface()
                const promise =
                    callMobileMethodWithResponse('getPublicSettings')

                respond({
                    jsonrpc: '2.0',
                    id: sentRequestId(handleRequest),
                    error: { code, message: 'Locked', data: 'detail' },
                })

                await expect(promise).rejects.toMatchObject({
                    code,
                    message: 'Locked',
                    data: 'detail',
                })
            },
        )

        it('describes itself with its code and message', async () => {
            const handleRequest = setAndroidInterface()
            const promise = callMobileMethodWithResponse('getPublicSettings')

            respond({
                jsonrpc: '2.0',
                id: sentRequestId(handleRequest),
                error: { code: -32_010, message: 'Locked' },
            })

            const error = (await promise.catch(
                (caught: unknown) => caught,
            )) as {
                getMessage: () => string
            }

            expect(error.getMessage()).toBe('[-32010] Locked')
        })

        it('does not settle any request for an error without an id', async () => {
            vi.useFakeTimers()
            setAndroidInterface()

            const promise = callMobileMethodWithResponse(
                'getPublicSettings',
                1000,
            )
            const assertion = expect(promise).rejects.toThrow(/Timeout/)

            respond({
                jsonrpc: '2.0',
                id: null,
                error: { code: -32_700, message: 'Parse error' },
            })

            await vi.advanceTimersByTimeAsync(1000)
            await assertion
        })
    })

    describe('batch responses', () => {
        it('settles every request answered in a batch', async () => {
            const handleRequest = setAndroidInterface()
            const settings = callMobileMethodWithResponse('getPublicSettings')
            const failing = callMobileMethodWithResponse('getPublicSettings')

            respond([
                {
                    jsonrpc: '2.0',
                    id: sentRequestId(handleRequest, 0),
                    result: { theme: 'dark' },
                },
                {
                    jsonrpc: '2.0',
                    id: sentRequestId(handleRequest, 1),
                    error: { code: -32_603, message: 'boom' },
                },
            ])

            await expect(settings).resolves.toEqual({ theme: 'dark' })
            await expect(failing).rejects.toMatchObject({ code: -32_603 })
        })
    })

    describe('unrelated messages', () => {
        it.each([
            ['malformed JSON', '{not json'],
            ['a primitive', 42],
            ['null', null],
            ['a non-JSON-RPC object', { type: 'TAB_OPEN' }],
            ['an array that is not a batch of responses', [null, 'TAB_OPEN']],
            [
                'a notification nobody listens to',
                { jsonrpc: '2.0', method: 'onBackPressed', params: {} },
            ],
        ])(
            'ignores %s and keeps the pending request alive',
            async (_, data) => {
                const handleRequest = setAndroidInterface()
                const promise =
                    callMobileMethodWithResponse('getPublicSettings')

                respond(data)
                respond({
                    jsonrpc: '2.0',
                    id: sentRequestId(handleRequest),
                    result: { theme: 'dark' },
                })

                await expect(promise).resolves.toEqual({ theme: 'dark' })
            },
        )

        it('settles a request only once', async () => {
            const handleRequest = setAndroidInterface()
            const promise = callMobileMethodWithResponse('getPublicSettings')
            const id = sentRequestId(handleRequest)

            respond({ jsonrpc: '2.0', id, result: 'first' })
            respond({
                jsonrpc: '2.0',
                id,
                error: { code: -32_603, message: 'late' },
            })

            await expect(promise).resolves.toBe('first')
        })
    })
})
