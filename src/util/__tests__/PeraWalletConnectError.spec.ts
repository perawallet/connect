import { describe, it, expect } from 'vitest'

import { PeraWalletConnectError } from '../PeraWalletConnectError.js'

describe('PeraWalletConnectError', () => {
    it('keeps the message when a dApp serialises the error', () => {
        const error = new PeraWalletConnectError(
            { type: 'SIGN_TRANSACTIONS' },
            'User rejected',
        )

        expect(JSON.parse(JSON.stringify(error))).toEqual({
            name: 'PeraWalletConnectError',
            data: { type: 'SIGN_TRANSACTIONS' },
            message: 'User rejected',
        })
        expect({ ...error }.message).toBe('User rejected')
    })
})
