import algosdk from 'algosdk'

import { PeraWalletConnectError } from '../PeraWalletConnectError.js'

// The txID a transaction would have without its fee and group ID. The wallet
// may raise the fee (quantum accounts need more than the dApp's estimate) and
// so regroup, but must leave everything else as requested.
function txIdIgnoringFeeAndGroup(txn: algosdk.Transaction) {
    const data = txn.toEncodingData()

    data.delete('fee')
    data.delete('grp')

    return algosdk.Transaction.fromEncodingData(data).txID()
}

function groupKey(txn: algosdk.Transaction) {
    return txn.group ? algosdk.bytesToBase64(txn.group) : undefined
}

// A wallet that raises a fee regroups every member of that group (including
// the ones it doesn't sign) over the new fees, and leaves other transactions
// alone, so a group can be neither split, joined nor created.
function expectedGroupKey(
    requested: algosdk.Transaction[],
    returnedFees: bigint[],
    index: number,
) {
    const key = groupKey(requested[index])

    if (!key) return undefined

    const members = requested
        .map((txn, memberIndex) => ({ txn, fee: returnedFees[memberIndex] }))
        .filter(({ txn }) => groupKey(txn) === key)

    // Untouched groups keep their ID, which also covers a request that holds
    // only part of a group.
    if (members.every(({ txn, fee }) => txn.fee === fee)) return key

    return algosdk.bytesToBase64(
        algosdk.computeGroupID(
            members.map(({ txn, fee }) => {
                const clone = algosdk.Transaction.fromEncodingData(
                    txn.toEncodingData(),
                )

                clone.fee = fee
                clone.group = undefined

                return clone
            }),
        ),
    )
}

/**
 * The wallet's answer is only as trustworthy as the channel it arrived on, and
 * a dApp submits what it gets back. Each signed transaction must be the one
 * that was asked for (same position, same fields apart from a fee at least as
 * high and the group ID that fee implies), so a wallet bug or a forged
 * response cannot hand the dApp a different transaction as the user's, or
 * break a group's atomicity.
 *
 * `signableIndices` are the positions in `requested` the wallet was asked to
 * sign; `signed` holds its answers for them, in the same order.
 */
function assertSignedTransactionsMatch(
    requested: algosdk.Transaction[],
    signableIndices: number[],
    signed: Uint8Array[],
) {
    if (signed.length !== signableIndices.length) {
        throw new PeraWalletConnectError(
            {
                type: 'SIGN_TRANSACTIONS',
                detail: {
                    expected: signableIndices.length,
                    received: signed.length,
                },
            },
            `Expected ${signableIndices.length} signed transaction(s) from the wallet but received ${signed.length}`,
        )
    }

    const mismatch = (position: number, received?: string) =>
        new PeraWalletConnectError(
            {
                type: 'SIGN_TRANSACTIONS',
                detail: {
                    index: position,
                    expected: requested[signableIndices[position]].txID(),
                    received,
                },
            },
            `The wallet returned a different transaction than the one requested at position ${position}`,
        )

    const decoded = signed.map((signedTxn, position) => {
        const expectedTxn = requested[signableIndices[position]]
        let txn: algosdk.Transaction

        try {
            txn = algosdk.decodeSignedTransaction(signedTxn).txn
        } catch {
            throw mismatch(position)
        }

        if (
            txn.fee < expectedTxn.fee ||
            txIdIgnoringFeeAndGroup(txn) !==
                txIdIgnoringFeeAndGroup(expectedTxn)
        ) {
            throw mismatch(position, txn.txID())
        }

        return txn
    })

    const returnedFees = requested.map(txn => txn.fee)

    signableIndices.forEach((index, position) => {
        returnedFees[index] = decoded[position].fee
    })

    decoded.forEach((txn, position) => {
        if (
            groupKey(txn) !==
            expectedGroupKey(requested, returnedFees, signableIndices[position])
        ) {
            throw mismatch(position, txn.txID())
        }
    })
}

export { assertSignedTransactionsMatch }
