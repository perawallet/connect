import { describe, it, expect, vi, afterEach } from 'vitest'

import { getPublicSettings } from '../webviewApi.js'
import { type PublicSettings } from '../webviewApiTypes.js'

const SETTINGS: PublicSettings = {
    theme: 'dark',
    network: 'mainnet',
    language: 'en',
    currency: 'USD',
}

function setAndroidInterface() {
    const handleRequest = vi.fn<(message: string) => void>()

    window.peraMobileInterface = { handleRequest }

    return handleRequest
}

function sentRequest(handleRequest: ReturnType<typeof setAndroidInterface>) {
    return JSON.parse(handleRequest.mock.calls[0][0]) as {
        id: number
        method: string
    }
}

function respond(data: unknown) {
    window.dispatchEvent(new MessageEvent('message', { data }))
}

describe('getPublicSettings', () => {
    afterEach(() => {
        delete window.peraMobileInterface
        vi.useRealTimers()
    })

    it('asks the Pera app for its public settings and resolves with them', async () => {
        const handleRequest = setAndroidInterface()

        const promise = getPublicSettings()
        const request = sentRequest(handleRequest)

        respond({ jsonrpc: '2.0', id: request.id, result: SETTINGS })

        expect(request.method).toBe('getPublicSettings')
        await expect(promise).resolves.toEqual(SETTINGS)
    })

    it('resolves with null when the app has no settings to share', async () => {
        const handleRequest = setAndroidInterface()

        const promise = getPublicSettings()

        respond({
            jsonrpc: '2.0',
            id: sentRequest(handleRequest).id,
            result: null,
        })

        await expect(promise).resolves.toBeNull()
    })

    it('gives up after two seconds by default, e.g. outside the Pera app', async () => {
        vi.useFakeTimers()

        const settled = vi.fn()
        const promise = getPublicSettings()

        promise.catch(settled)
        await vi.advanceTimersByTimeAsync(1999)

        expect(settled).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(1)

        await expect(promise).rejects.toThrow(/Timeout/)
    })

    it('honours a custom timeout', async () => {
        vi.useFakeTimers()

        const promise = getPublicSettings(500)
        const assertion = expect(promise).rejects.toThrow(/Timeout/)

        await vi.advanceTimersByTimeAsync(500)

        await assertion
    })
})
