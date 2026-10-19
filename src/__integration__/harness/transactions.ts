import algosdk from 'algosdk'

const TESTNET_GENESIS_HASH = 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDeTLMpPkl7jG8='

// Fixed so building a transaction never needs algod.
const SUGGESTED_PARAMS: algosdk.SuggestedParams = {
    flatFee: true,
    fee: 1000n,
    minFee: 1000n,
    firstValid: 1000n,
    lastValid: 2000n,
    genesisID: 'testnet-v1.0',
    genesisHash: algosdk.base64ToBytes(TESTNET_GENESIS_HASH),
}

function makePayment(sender: string, receiver: string, amount = 1000) {
    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender,
        receiver,
        amount,
        suggestedParams: SUGGESTED_PARAMS,
    })
}

export { SUGGESTED_PARAMS, makePayment }
