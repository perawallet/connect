import { describe, expect, it } from 'vitest'

import { getErrorMessage } from '../errorUtils'

describe('getErrorMessage', () => {
    it("returns an error's message", () => {
        expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
    })

    it('reads the message of an error-like object from another realm', () => {
        expect(getErrorMessage({ message: 'boom' }, 'fallback')).toBe('boom')
    })

    it.each([
        ['an empty message', new Error('')],
        ['a non-string message', { message: 42 }],
        ['a string', 'boom'],
        ['null', null],
        ['undefined', undefined],
    ])('falls back for %s', (_label, error) => {
        expect(getErrorMessage(error, 'fallback')).toBe('fallback')
    })
})
