import { describe, it, expect } from 'vitest'
import algosdk from 'algosdk'

import { assertSignedTransactionsMatch } from '../signedTransactionMatch.js'
import { PeraWalletConnectError } from '../../PeraWalletConnectError.js'

const sender = algosdk.generateAccount()
const receiver = algosdk.generateAccount().addr.toString()

const BASE_FEE = 1000

function payment({
    amount = 1,
    fee = BASE_FEE,
}: { amount?: number; fee?: number } = {}) {
    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: sender.addr,
        receiver,
        amount,
        suggestedParams: {
            fee,
            minFee: BASE_FEE,
            flatFee: true,
            firstValid: 1,
            lastValid: 1000,
            genesisID: 'testnet-v1.0',
            genesisHash: new Uint8Array(32).fill(7),
        },
    })
}

function group(...txns: algosdk.Transaction[]) {
    algosdk.assignGroupID(txns)

    return txns
}

// The same transaction with the fee the wallet chose, outside any group.
function withFee(txn: algosdk.Transaction, fee: number) {
    const copy = algosdk.Transaction.fromEncodingData(txn.toEncodingData())

    copy.fee = BigInt(fee)
    copy.group = undefined

    return copy
}

function sign(txn: algosdk.Transaction) {
    return txn.signTxn(sender.sk)
}

function captureError(run: () => unknown): PeraWalletConnectError {
    try {
        run()
    } catch (error) {
        return error as PeraWalletConnectError
    }

    throw new Error('Expected the call to throw')
}

describe('assertSignedTransactionsMatch', () => {
    describe('accepts', () => {
        it('exactly the transactions that were requested', () => {
            const requested = [payment({ amount: 1 }), payment({ amount: 2 })]

            expect(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [0, 1],
                    requested.map(sign),
                ),
            ).not.toThrow()
        })

        it('answers for only the positions the wallet was asked to sign', () => {
            const requested = [payment({ amount: 1 }), payment({ amount: 2 })]

            expect(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [1],
                    [sign(requested[1])],
                ),
            ).not.toThrow()
        })

        it('an untouched group that keeps its group ID', () => {
            const requested = group(
                payment({ amount: 1 }),
                payment({ amount: 2 }),
            )

            expect(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [0, 1],
                    requested.map(sign),
                ),
            ).not.toThrow()
        })

        it('a raised fee on an ungrouped transaction', () => {
            const requested = [payment()]

            expect(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [0],
                    [sign(withFee(requested[0], BASE_FEE * 3))],
                ),
            ).not.toThrow()
        })

        it('a raised fee with every group member regrouped over the new fees', () => {
            const requested = group(
                payment({ amount: 1 }),
                payment({ amount: 2 }),
            )
            const returned = group(
                withFee(requested[0], BASE_FEE * 2),
                withFee(requested[1], BASE_FEE),
            )

            expect(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [0, 1],
                    returned.map(sign),
                ),
            ).not.toThrow()
        })

        it('a regrouped member when the wallet signs only part of the group', () => {
            const requested = group(
                payment({ amount: 1 }),
                payment({ amount: 2 }),
            )
            // The other member is regrouped too, but signed by someone else.
            const [raised] = group(
                withFee(requested[0], BASE_FEE * 2),
                withFee(requested[1], BASE_FEE),
            )

            expect(() =>
                assertSignedTransactionsMatch(requested, [0], [sign(raised)]),
            ).not.toThrow()
        })
    })

    describe('rejects', () => {
        it('a different number of signed transactions than requested', () => {
            const requested = [payment({ amount: 1 }), payment({ amount: 2 })]

            const error = captureError(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [0, 1],
                    [sign(requested[0])],
                ),
            )

            expect(error).toBeInstanceOf(PeraWalletConnectError)
            expect(error.data).toEqual({
                type: 'SIGN_TRANSACTIONS',
                detail: { expected: 2, received: 1 },
            })
        })

        it('bytes that are not a signed transaction', () => {
            const requested = [payment()]

            const error = captureError(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [0],
                    [new Uint8Array([1, 2, 3])],
                ),
            )

            expect(error.data).toEqual({
                type: 'SIGN_TRANSACTIONS',
                detail: {
                    index: 0,
                    expected: requested[0].txID(),
                    received: undefined,
                },
            })
        })

        it('a transaction with different fields', () => {
            const requested = [payment({ amount: 1 })]
            const forged = payment({ amount: 1_000_000 })

            const error = captureError(() =>
                assertSignedTransactionsMatch(requested, [0], [sign(forged)]),
            )

            expect(error.data).toEqual({
                type: 'SIGN_TRANSACTIONS',
                detail: {
                    index: 0,
                    expected: requested[0].txID(),
                    received: forged.txID(),
                },
            })
        })

        it('transactions returned in a different order', () => {
            const requested = [payment({ amount: 1 }), payment({ amount: 2 })]

            const error = captureError(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [0, 1],
                    [sign(requested[1]), sign(requested[0])],
                ),
            )

            expect(error.data.detail).toMatchObject({ index: 0 })
        })

        it('reports the position within the answers, not the request', () => {
            const requested = [payment({ amount: 1 }), payment({ amount: 2 })]

            const error = captureError(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [1],
                    [sign(payment({ amount: 3 }))],
                ),
            )

            expect(error.data.detail).toMatchObject({
                index: 0,
                expected: requested[1].txID(),
            })
        })

        it('a lowered fee', () => {
            const requested = [payment({ fee: BASE_FEE * 2 })]

            const error = captureError(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [0],
                    [sign(withFee(requested[0], BASE_FEE))],
                ),
            )

            expect(error.data.type).toBe('SIGN_TRANSACTIONS')
        })

        it('a raised fee that keeps the old group ID', () => {
            const requested = group(
                payment({ amount: 1 }),
                payment({ amount: 2 }),
            )
            const raised = withFee(requested[0], BASE_FEE * 2)

            raised.group = requested[0].group

            const error = captureError(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [0, 1],
                    [sign(raised), sign(requested[1])],
                ),
            )

            expect(error.data.detail).toMatchObject({
                index: 0,
                received: raised.txID(),
            })
        })

        it('a group the dApp did not ask for', () => {
            const requested = [payment({ amount: 1 }), payment({ amount: 2 })]
            const grouped = group(
                withFee(requested[0], BASE_FEE),
                withFee(requested[1], BASE_FEE),
            )

            const error = captureError(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [0, 1],
                    grouped.map(sign),
                ),
            )

            expect(error.data.type).toBe('SIGN_TRANSACTIONS')
        })

        it('a requested group the wallet split up', () => {
            const requested = group(
                payment({ amount: 1 }),
                payment({ amount: 2 }),
            )

            const error = captureError(() =>
                assertSignedTransactionsMatch(
                    requested,
                    [0, 1],
                    [sign(withFee(requested[0], BASE_FEE)), sign(requested[1])],
                ),
            )

            expect(error.data.detail).toMatchObject({ index: 0 })
        })

        it('a group regrouped with a member the dApp never sent', () => {
            const requested = group(
                payment({ amount: 1 }),
                payment({ amount: 2 }),
            )
            const [raised] = group(
                withFee(requested[0], BASE_FEE * 2),
                withFee(requested[1], BASE_FEE),
                payment({ amount: 3 }),
            )

            const error = captureError(() =>
                assertSignedTransactionsMatch(requested, [0], [sign(raised)]),
            )

            expect(error.data.detail).toMatchObject({ index: 0 })
        })
    })
})
