import { describe, it, expect } from 'vitest'
import { type IWalletConnectSession } from '@perawallet/walletconnect'

import {
    getWalletConnectEventMessage,
    isConnectorForStoredSession,
} from '../walletConnectEvents.js'

describe('getWalletConnectEventMessage', () => {
    it('reads the message WalletConnect v1 sends with disconnect', () => {
        expect(
            getWalletConnectEventMessage({
                event: 'disconnect',
                params: [{ message: 'Session Rejected' }],
            }),
        ).toBe('Session Rejected')
    })

    it.each([
        ['null', null],
        ['no params', { event: 'disconnect' }],
        ['empty params', { params: [] }],
        ['a param without a message', { params: [{}] }],
        ['a non-string message', { params: [{ message: 42 }] }],
    ])('is undefined for %s', (_name, payload) => {
        expect(getWalletConnectEventMessage(payload)).toBeUndefined()
    })
})

describe('isConnectorForStoredSession', () => {
    const connector = { connected: true, peerId: 'peer-1', key: 'key-1' }
    const storedSession = {
        connected: true,
        peerId: 'peer-1',
        key: 'key-1',
    } as IWalletConnectSession

    it('holds for a live connector of the stored session', () => {
        expect(isConnectorForStoredSession(connector, storedSession)).toBe(true)
    })

    it('does not hold for a connector that is no longer connected', () => {
        expect(
            isConnectorForStoredSession(
                { ...connector, connected: false },
                storedSession,
            ),
        ).toBe(false)
    })

    it('does not hold without a stored session', () => {
        expect(isConnectorForStoredSession(connector, null)).toBe(false)
    })

    it.each([
        ['peer', { peerId: 'peer-2' }],
        ['key', { key: 'key-2' }],
    ])(
        'does not hold when the stored session has another %s',
        (_name, change) => {
            expect(
                isConnectorForStoredSession(connector, {
                    ...storedSession,
                    ...change,
                }),
            ).toBe(false)
        },
    )
})
