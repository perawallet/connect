import type algosdk from 'algosdk'

import { type SignerTransaction } from '../model/peraWalletModels'
import { PeraWalletConnectError } from '../PeraWalletConnectError'

// Validated before the round-trip so a bad caller never triggers a wallet
// prompt for the wrong slots and then fails on the count check.
function assertValidIndexesToSign(
    txnGroup: algosdk.Transaction[],
    indexesToSign: number[],
) {
    const hasInvalidIndex = indexesToSign.some(
        (index, position) =>
            !Number.isInteger(index) ||
            index < 0 ||
            index >= txnGroup.length ||
            indexesToSign.indexOf(index) !== position,
    )

    if (hasInvalidIndex) {
        throw new PeraWalletConnectError(
            {
                type: 'SIGN_TRANSACTIONS',
                detail: { indexesToSign, groupLength: txnGroup.length },
            },
            `Invalid indexesToSign ${JSON.stringify(indexesToSign)}: expected unique integers below ${txnGroup.length}`,
        )
    }
}

// Slots outside `indexesToSign` are sent with `signers: []` (ARC-0001), so the
// wallet shows the whole group but signs only the requested ones.
function buildSignerGroupForIndexes(
    txnGroup: algosdk.Transaction[],
    indexesToSign: number[],
): SignerTransaction[] {
    assertValidIndexesToSign(txnGroup, indexesToSign)

    return txnGroup.map((txn, index) =>
        indexesToSign.includes(index) ? { txn } : { txn, signers: [] },
    )
}

// The wallet returns signed transactions in group order; TransactionSigner
// requires result[i] to correspond to txnGroup[indexesToSign[i]].
function orderSignedByIndexes(
    signedInGroupOrder: Uint8Array[],
    indexesToSign: number[],
) {
    const ascending = [...indexesToSign].sort((a, b) => a - b)

    return indexesToSign.map(
        index => signedInGroupOrder[ascending.indexOf(index)],
    )
}

export { buildSignerGroupForIndexes, orderSignedByIndexes }
