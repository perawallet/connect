import { describe, it, expect, afterEach, vi } from 'vitest'

import {
    PERA_PROVIDER_ERROR_CODES,
    getPeraProvider,
    isPeraProviderError,
    type PeraProvider,
} from '../peraProviderTypes.js'

describe('isPeraProviderError', () => {
    it('accepts an Error named PeraProviderError with a numeric code', () => {
        const error = Object.assign(new Error('rejected'), {
            name: 'PeraProviderError',
            code: PERA_PROVIDER_ERROR_CODES.USER_REJECTED,
        })

        expect(isPeraProviderError(error)).toBe(true)
    })

    it('accepts a structured clone that is no longer an Error instance', () => {
        const cloned = {
            name: 'PeraProviderError',
            code: PERA_PROVIDER_ERROR_CODES.UNAUTHORIZED,
            message: 'Not connected',
        }

        expect(isPeraProviderError(cloned)).toBe(true)
    })

    it.each([
        ['null', null],
        ['a string', 'PeraProviderError'],
        ['a generic Error', new Error('boom')],
        [
            'a non-numeric code',
            { name: 'PeraProviderError', code: String(-32_002) },
        ],
        ['another error name', { name: 'TypeError', code: -32_002 }],
    ])('rejects %s', (_, value) => {
        expect(isPeraProviderError(value)).toBe(false)
    })
})

describe('getPeraProvider', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete window.pera
    })

    it('returns the injected version 1 provider', () => {
        const provider = { version: '1' } as PeraProvider

        window.pera = provider

        expect(getPeraProvider()).toBe(provider)
    })

    it('returns null when the extension is not installed', () => {
        expect(getPeraProvider()).toBeNull()
    })

    it('returns null for a provider version it does not speak', () => {
        window.pera = { version: '2' } as unknown as PeraProvider

        expect(getPeraProvider()).toBeNull()
    })

    it('returns null when window.pera is not an object', () => {
        window.pera = 'pera' as unknown as PeraProvider

        expect(getPeraProvider()).toBeNull()
    })

    it('returns null during server-side rendering', () => {
        vi.stubGlobal('window', undefined)

        expect(getPeraProvider()).toBeNull()
    })
})
