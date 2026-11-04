import { describe, it, expect } from 'vitest'

import algosdk from 'algosdk'

import {
    assertValidAlgodClients,
    createDefaultAlgodClient,
    getNetworkFromChainId,
} from '../algodUtils.js'
import {
    DEFAULT_ALGOD_PORT,
    DEFAULT_ALGOD_SERVERS,
    DEFAULT_ALGOD_TOKEN,
    MAINNET_NODE_CHAIN_ID,
    TESTNET_NODE_CHAIN_ID,
    BETANET_NODE_CHAIN_ID,
    ALGORAND_NODE_CHAIN_ID,
} from '../algodConstants.js'

describe('algodUtils', () => {
    describe('default algod nodes', () => {
        it('point mainnet and testnet at their own networks', () => {
            expect(DEFAULT_ALGOD_SERVERS.mainnet).toContain('mainnet-api')
            expect(DEFAULT_ALGOD_SERVERS.testnet).toContain('testnet-api')
            expect(DEFAULT_ALGOD_PORT).toBe(443)
        })

        it("are public nodes, not Pera's own infrastructure", () => {
            Object.values(DEFAULT_ALGOD_SERVERS).forEach(server => {
                expect(server).not.toContain('perawallet.app')
            })
        })

        it('ship no API token, so none is published in the bundle', () => {
            expect(DEFAULT_ALGOD_TOKEN).toBe('')
        })

        it('builds an algod client for the requested network', () => {
            expect(createDefaultAlgodClient('mainnet')).toBeInstanceOf(
                algosdk.Algodv2,
            )
        })
    })

    describe('getNetworkFromChainId', () => {
        it('maps the mainnet chain id to mainnet', () => {
            expect(getNetworkFromChainId(MAINNET_NODE_CHAIN_ID)).toBe('mainnet')
        })

        it('maps the testnet chain id to testnet', () => {
            expect(getNetworkFromChainId(TESTNET_NODE_CHAIN_ID)).toBe('testnet')
        })

        it('returns null for the all-networks chain id, which pins no network', () => {
            expect(getNetworkFromChainId(ALGORAND_NODE_CHAIN_ID)).toBeNull()
        })

        it('returns null for an unset chain id', () => {
            expect(getNetworkFromChainId(undefined)).toBeNull()
        })

        it('returns null for a network this client has no algod for (betanet)', () => {
            expect(getNetworkFromChainId(BETANET_NODE_CHAIN_ID)).toBeNull()
        })
    })

    describe('assertValidAlgodClients', () => {
        it('accepts algosdk clients for every network', () => {
            expect(() =>
                assertValidAlgodClients({
                    mainnet: createDefaultAlgodClient('mainnet'),
                    testnet: createDefaultAlgodClient('testnet'),
                }),
            ).not.toThrow()
        })

        it.each([
            ['a missing client', null],
            ['a server URL instead of a client', 'https://algod.example.com'],
            ['an object without accountInformation', { getStatus: () => 1 }],
        ])('rejects %s, naming the network', (_, client) => {
            expect(() =>
                assertValidAlgodClients({
                    mainnet: createDefaultAlgodClient('mainnet'),
                    testnet: client as unknown as algosdk.Algodv2,
                }),
            ).toThrow(
                expect.objectContaining({
                    message:
                        'algod.testnet must be an algosdk.Algodv2 instance.',
                    data: {
                        type: 'INVALID_ALGOD_CLIENT',
                        detail: { network: 'testnet' },
                    },
                }),
            )
        })
    })
})
