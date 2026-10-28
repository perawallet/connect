import algosdk from 'algosdk'
import { describe, expect, it } from 'vitest'

import { AlgodClientPool } from '../algod.js'

describe('AlgodClientPool', () => {
    it('hands out the supplied client for its network', () => {
        const supplied = new algosdk.Algodv2('', 'https://my-node.test', '')
        const pool = new AlgodClientPool({ mainnet: supplied })

        expect(pool.get('mainnet')).toBe(supplied)
    })

    it('falls back to a public node for a network left out', () => {
        const supplied = new algosdk.Algodv2('', 'https://my-node.test', '')
        const pool = new AlgodClientPool({ mainnet: supplied })

        const testnet = pool.get('testnet')

        expect(testnet).toBeInstanceOf(algosdk.Algodv2)
        expect(testnet).not.toBe(supplied)
    })

    it('reuses one client per network', () => {
        const pool = new AlgodClientPool()

        expect(pool.get('testnet')).toBe(pool.get('testnet'))
        expect(pool.get('testnet')).not.toBe(pool.get('mainnet'))
    })
})
