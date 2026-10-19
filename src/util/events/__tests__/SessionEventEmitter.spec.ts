import { describe, expect, it, vi } from 'vitest'

import { SessionEventEmitter } from '../SessionEventEmitter.js'

describe('SessionEventEmitter', () => {
    it('delivers the payload to every handler of that event only', () => {
        const emitter = new SessionEventEmitter()
        const onNetworkChanged = vi.fn()
        const onDisconnect = vi.fn()

        emitter.on('networkChanged', onNetworkChanged)
        emitter.on('disconnect', onDisconnect)
        emitter.emit('networkChanged', { network: 'testnet' })

        expect(onNetworkChanged).toHaveBeenCalledWith({ network: 'testnet' })
        expect(onDisconnect).not.toHaveBeenCalled()
    })

    it('stops calling a handler once it unsubscribes', () => {
        const emitter = new SessionEventEmitter()
        const handler = vi.fn()

        const unsubscribe = emitter.on('disconnect', handler)

        unsubscribe()
        emitter.emit('disconnect', undefined)

        expect(handler).not.toHaveBeenCalled()
    })

    it('keeps notifying the other handlers when one throws', () => {
        const emitter = new SessionEventEmitter()
        const handler = vi.fn()

        emitter.on('disconnect', () => {
            throw new Error('faulty listener')
        })
        emitter.on('disconnect', handler)

        expect(() => emitter.emit('disconnect', undefined)).not.toThrow()
        expect(handler).toHaveBeenCalledOnce()
    })

    it('drops every handler on clear()', () => {
        const emitter = new SessionEventEmitter()
        const handler = vi.fn()

        emitter.on('disconnect', handler)
        emitter.on('networkChanged', handler)
        emitter.clear()
        emitter.emit('disconnect', undefined)
        emitter.emit('networkChanged', { network: 'mainnet' })

        expect(handler).not.toHaveBeenCalled()
    })
})
