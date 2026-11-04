import { describe, it, expect } from 'vitest'

import { mapEmptySignaturesError } from '../emptySignaturesError.js'
import { PERA_PROVIDER_ERROR_CODES } from '../peraProviderTypes.js'
import { PeraWalletConnectError } from '../../../util/PeraWalletConnectError.js'

describe('mapEmptySignaturesError', () => {
    it('wraps an ordinary error as EMPTY_SIGNATURES, keeping its message', () => {
        const failure = new Error('socket closed')

        const error = mapEmptySignaturesError(failure)

        expect(error).toBeInstanceOf(PeraWalletConnectError)
        expect(error.message).toBe('socket closed')
        expect(error.data).toEqual({
            type: 'EMPTY_SIGNATURES',
            detail: { reason: 'wallet-error', error: failure },
        })
    })

    it.each([
        ['undefined', undefined],
        ['a string', 'nope'],
        ['an error without a message', new Error('')],
    ])('falls back to a generic message for %s', (_, failure) => {
        const error = mapEmptySignaturesError(failure)

        expect(error.message).toBe('Failed to get empty signatures')
        expect(error.data.type).toBe('EMPTY_SIGNATURES')
    })

    it('recognises a provider error that crossed a realm as a plain object', () => {
        const failure = {
            name: 'PeraProviderError',
            code: PERA_PROVIDER_ERROR_CODES.TIMED_OUT,
            message: 'No answer',
        }

        const error = mapEmptySignaturesError(failure)

        expect(error.data).toEqual({
            type: 'EMPTY_SIGNATURES_TIMEOUT',
            detail: failure,
        })
        expect(error.message).toBe('No answer')
    })
})
