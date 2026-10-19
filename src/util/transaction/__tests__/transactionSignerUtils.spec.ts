import algosdk from 'algosdk'
import { describe, expect, it } from 'vitest'

import {
    buildSignerGroupForIndexes,
    orderSignedByIndexes,
} from '../transactionSignerUtils.js'

const sender = algosdk.generateAccount().addr

function makeGroup(size: number) {
    return Array.from({ length: size }, (_, index) =>
        algosdk.makePaymentTxnWithSuggestedParamsFromObject({
            sender,
            receiver: sender,
            amount: index,
            suggestedParams: {
                fee: 1000,
                minFee: 1000,
                firstValid: 1,
                lastValid: 1000,
                genesisHash: new Uint8Array(32),
                genesisID: 'testnet-v1.0',
            },
        }),
    )
}

describe('buildSignerGroupForIndexes', () => {
    it('marks the slots outside indexesToSign as not to be signed', () => {
        const group = makeGroup(3)

        const signerGroup = buildSignerGroupForIndexes(group, [2, 0])

        expect(signerGroup).toEqual([
            { txn: group[0] },
            { txn: group[1], signers: [] },
            { txn: group[2] },
        ])
    })

    it.each([
        ['out of range', [3]],
        ['negative', [-1]],
        ['fractional', [0.5]],
        ['duplicated', [1, 1]],
    ])('rejects %s indexes before reaching the wallet', (_label, indexes) => {
        expect(() => buildSignerGroupForIndexes(makeGroup(3), indexes)).toThrow(
            expect.objectContaining({
                data: expect.objectContaining({ type: 'SIGN_TRANSACTIONS' }),
            }),
        )
    })
})

describe('orderSignedByIndexes', () => {
    it('returns signatures in the order the indexes were requested', () => {
        const first = new Uint8Array([0])
        const third = new Uint8Array([2])

        expect(orderSignedByIndexes([first, third], [2, 0])).toEqual([
            third,
            first,
        ])
    })
})
