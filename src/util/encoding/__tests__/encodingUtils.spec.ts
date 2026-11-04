import { describe, expect, it } from 'vitest'

import { bytesToBase64 } from '../encodingUtils.js'

describe('bytesToBase64', () => {
    it('encodes bytes', () => {
        expect(bytesToBase64(new Uint8Array([104, 105]))).toBe('aGk=')
    })

    it.each([
        ['an ArrayBuffer', new Uint8Array([104, 105]).buffer],
        ['a number array', [104, 105]],
        ['a string, as UTF-8', 'hi'],
    ])('encodes %s the way earlier releases did', (_label, data) => {
        expect(bytesToBase64(data as unknown as Uint8Array)).toBe('aGk=')
    })
})
