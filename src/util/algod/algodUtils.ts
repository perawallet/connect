import algosdk from 'algosdk'

import {
    DEFAULT_ALGOD_PORT,
    DEFAULT_ALGOD_SERVERS,
    DEFAULT_ALGOD_TOKEN,
    MAINNET_NODE_CHAIN_ID,
    TESTNET_NODE_CHAIN_ID,
} from './algodConstants'
import { type AlgodClients, type NetworkToggle } from './algodTypes'
import { type AlgorandChainIDs } from '../peraWalletTypes'
import { PeraWalletConnectError } from '../PeraWalletConnectError'

function createDefaultAlgodClient(network: NetworkToggle) {
    return new algosdk.Algodv2(
        DEFAULT_ALGOD_TOKEN,
        DEFAULT_ALGOD_SERVERS[network],
        DEFAULT_ALGOD_PORT,
    )
}

/**
 * The network a chain id pins the session to, or `null` when it does not pin
 * one: all-networks `4160`, unset, or a network this client has no algod for.
 * Callers that can tolerate a guess apply their own fallback.
 */
function getNetworkFromChainId(
    chainId?: AlgorandChainIDs,
): NetworkToggle | null {
    if (chainId === MAINNET_NODE_CHAIN_ID) {
        return 'mainnet'
    }

    if (chainId === TESTNET_NODE_CHAIN_ID) {
        return 'testnet'
    }

    return null
}

/**
 * Checks supplied algod clients up front. Plain-JS callers bypass the type, and
 * a wrong value would otherwise surface much later as a failed account lookup.
 */
function assertValidAlgodClients(clients: AlgodClients) {
    ;(Object.entries(clients) as [NetworkToggle, unknown][]).forEach(
        ([network, client]) => {
            if (
                !client ||
                typeof (client as { accountInformation?: unknown })
                    .accountInformation !== 'function'
            ) {
                throw new PeraWalletConnectError(
                    { type: 'INVALID_ALGOD_CLIENT', detail: { network } },
                    `algod.${network} must be an algosdk.Algodv2 instance.`,
                )
            }
        },
    )
}

export {
    assertValidAlgodClients,
    createDefaultAlgodClient,
    getNetworkFromChainId,
}
