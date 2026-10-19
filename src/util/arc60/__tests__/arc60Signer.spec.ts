import { describe, it, expect, vi } from 'vitest'
import algosdk from 'algosdk'

import {
    assertArc60DomainMatchesOrigin,
    assertValidArc60Account,
    lookupArc60Signer,
    resolveArc60SignerNetwork,
} from '../arc60Signer.js'
import { PeraWalletConnectError } from '../../PeraWalletConnectError.js'
import {
    ALGORAND_NODE_CHAIN_ID,
    BETANET_NODE_CHAIN_ID,
    MAINNET_NODE_CHAIN_ID,
    TESTNET_NODE_CHAIN_ID,
} from '../../algod/algodConstants.js'
import { type PeraWalletNetwork } from '../../model/peraWalletModels.js'

const ACCOUNT = algosdk.generateAccount().addr.toString()
const AUTH_ACCOUNT = algosdk.generateAccount().addr.toString()

// Stands in for algod: only the account-header request the lookup makes.
function makeAlgod(accountInfo: Promise<{ authAddr?: algosdk.Address }>) {
    const exclude = vi.fn(() => ({ do: () => accountInfo }))
    const accountInformation = vi.fn(() => ({ exclude }))

    return {
        algod: { accountInformation } as unknown as algosdk.Algodv2,
        accountInformation,
        exclude,
    }
}

function captureError(run: () => unknown): PeraWalletConnectError {
    try {
        run()
    } catch (error) {
        return error as PeraWalletConnectError
    }

    throw new Error('Expected the call to throw')
}

describe('assertArc60DomainMatchesOrigin', () => {
    it("accepts the page's own host", () => {
        expect(() =>
            assertArc60DomainMatchesOrigin(window.location.host),
        ).not.toThrow()
    })

    it("accepts the page's full origin", () => {
        expect(() =>
            assertArc60DomainMatchesOrigin(window.location.origin),
        ).not.toThrow()
    })

    it('rejects a domain other than the page origin', () => {
        const error = captureError(() =>
            assertArc60DomainMatchesOrigin('evil.example.com'),
        )

        expect(error).toBeInstanceOf(PeraWalletConnectError)
        expect(error.data.type).toBe('SIGN_DATA_DOMAIN_MISMATCH')
        expect(error.message).toContain('evil.example.com')
    })
})

describe('resolveArc60SignerNetwork', () => {
    it.each([
        [MAINNET_NODE_CHAIN_ID, 'mainnet'],
        [TESTNET_NODE_CHAIN_ID, 'testnet'],
    ] as const)(
        'uses the network a session pinned to %i is served on',
        (chainId, network) => {
            expect(resolveArc60SignerNetwork(chainId, undefined)).toBe(network)
        },
    )

    it('accepts an explicit network that agrees with the pinned one', () => {
        expect(
            resolveArc60SignerNetwork(MAINNET_NODE_CHAIN_ID, 'mainnet'),
        ).toBe('mainnet')
    })

    it.each([ALGORAND_NODE_CHAIN_ID, undefined] as const)(
        'uses the explicit network for an all-networks session (%s)',
        chainId => {
            expect(resolveArc60SignerNetwork(chainId, 'testnet')).toBe(
                'testnet',
            )
        },
    )

    it.each([ALGORAND_NODE_CHAIN_ID, undefined] as const)(
        'requires a network for an all-networks session (%s)',
        chainId => {
            const error = captureError(() =>
                resolveArc60SignerNetwork(chainId, undefined),
            )

            expect(error.data.type).toBe('SIGN_DATA_NETWORK_REQUIRED')
        },
    )

    it('rejects a network other than the one the session is pinned to', () => {
        const error = captureError(() =>
            resolveArc60SignerNetwork(MAINNET_NODE_CHAIN_ID, 'testnet'),
        )

        expect(error.data).toEqual({
            type: 'SIGN_DATA_NETWORK_MISMATCH',
            detail: { network: 'testnet', chainId: MAINNET_NODE_CHAIN_ID },
        })
    })

    it('rejects a session pinned to a network accounts cannot be read on', () => {
        const error = captureError(() =>
            resolveArc60SignerNetwork(BETANET_NODE_CHAIN_ID, undefined),
        )

        expect(error.data).toEqual({
            type: 'SIGN_DATA_NETWORK_UNSUPPORTED',
            detail: BETANET_NODE_CHAIN_ID,
        })
    })

    it.each(['betanet', 'MainNet', ''])(
        'rejects the unsupported network %j from plain-JS callers',
        network => {
            const error = captureError(() =>
                resolveArc60SignerNetwork(
                    ALGORAND_NODE_CHAIN_ID,
                    network as PeraWalletNetwork,
                ),
            )

            expect(error.data).toEqual({
                type: 'SIGN_DATA_NETWORK_UNSUPPORTED',
                detail: network,
            })
        },
    )
})

describe('lookupArc60Signer', () => {
    it('resolves an account that is not rekeyed to itself', async () => {
        const { algod } = makeAlgod(Promise.resolve({}))

        const resolution = await lookupArc60Signer(algod, ACCOUNT, 'mainnet')

        expect(resolution).toEqual({
            accountAddress: ACCOUNT,
            signerAddress: ACCOUNT,
            signer: algosdk.decodeAddress(ACCOUNT).publicKey,
            isRekeyed: false,
            network: 'mainnet',
        })
    })

    it('resolves a rekeyed account to its auth address', async () => {
        const { algod } = makeAlgod(
            Promise.resolve({
                authAddr: algosdk.Address.fromString(AUTH_ACCOUNT),
            }),
        )

        const resolution = await lookupArc60Signer(algod, ACCOUNT, 'testnet')

        expect(resolution).toEqual({
            accountAddress: ACCOUNT,
            signerAddress: AUTH_ACCOUNT,
            signer: algosdk.decodeAddress(AUTH_ACCOUNT).publicKey,
            isRekeyed: true,
            network: 'testnet',
        })
    })

    it('asks algod for the account header only, so large accounts still resolve', async () => {
        const { algod, accountInformation, exclude } = makeAlgod(
            Promise.resolve({}),
        )

        await lookupArc60Signer(algod, ACCOUNT, 'mainnet')

        expect(accountInformation).toHaveBeenCalledWith(ACCOUNT)
        expect(exclude).toHaveBeenCalledWith('all')
    })

    it('wraps an algod failure with the account, network and cause', async () => {
        const cause = new Error('Result limit exceeded')
        const { algod } = makeAlgod(Promise.reject(cause))

        const error = (await lookupArc60Signer(algod, ACCOUNT, 'mainnet').catch(
            (caught: unknown) => caught,
        )) as PeraWalletConnectError

        expect(error).toBeInstanceOf(PeraWalletConnectError)
        expect(error.data).toEqual({
            type: 'SIGN_DATA_AUTH_ADDR_LOOKUP_FAILED',
            detail: cause,
        })
        expect(error.message).toContain(ACCOUNT)
        expect(error.message).toContain('mainnet')
        expect(error.cause).toBe(cause)
    })
})

describe('assertValidArc60Account', () => {
    it('accepts a valid Algorand address', () => {
        expect(() => assertValidArc60Account(ACCOUNT)).not.toThrow()
    })

    it.each(['', 'not-an-address', ACCOUNT.slice(0, -1)])(
        'rejects %j',
        address => {
            const error = captureError(() => assertValidArc60Account(address))

            expect(error.data.type).toBe('SIGN_DATA_INVALID_ADDRESS')
        },
    )
})
