import algosdk from 'algosdk'

import { isArc60OriginMismatch } from '../../transport/extension/originBinding'
import { ALGORAND_NODE_CHAIN_ID } from '../algod/algodConstants'
import { getNetworkFromChainId } from '../algod/algodUtils'
import {
    type PeraWalletArc60SignerResolution,
    type PeraWalletNetwork,
} from '../model/peraWalletModels'
import { PeraWalletConnectError } from '../PeraWalletConnectError'
import { type AlgorandChainIDs } from '../peraWalletTypes'

// SIWA origin binding, checked on every transport before the wallet is
// contacted. A guard for honest integrations: the extension enforces the same
// rule on its own.
function assertArc60DomainMatchesOrigin(domain: string) {
    if (isArc60OriginMismatch(domain, window.location.origin)) {
        throw new PeraWalletConnectError(
            { type: 'SIGN_DATA_DOMAIN_MISMATCH' },
            `ARC-60 domain "${domain}" does not match the page origin "${window.location.origin}"`,
        )
    }
}

// Rekeys are per network and the wallet checks them on the network it is
// connected to, which connect cannot observe. A session pinned to mainnet or
// testnet is only served there, so the lookup uses that network and an
// explicit one may only agree with it; an all-networks session needs the
// caller to say.
function resolveArc60SignerNetwork(
    chainId: AlgorandChainIDs | undefined,
    network: PeraWalletNetwork | undefined,
): PeraWalletNetwork {
    // Plain-JS callers bypass the type, and the credential picker treats
    // anything but "mainnet" as testnet, so the value is checked here.
    if (
        network !== undefined &&
        network !== 'mainnet' &&
        network !== 'testnet'
    ) {
        throw new PeraWalletConnectError(
            { type: 'SIGN_DATA_NETWORK_UNSUPPORTED', detail: network },
            `Unsupported network "${String(network)}": use "mainnet" or "testnet".`,
        )
    }

    const isAllNetworksSession =
        chainId === undefined || chainId === ALGORAND_NODE_CHAIN_ID
    const sessionNetwork = getNetworkFromChainId(chainId)

    if (!isAllNetworksSession && !sessionNetwork) {
        throw new PeraWalletConnectError(
            { type: 'SIGN_DATA_NETWORK_UNSUPPORTED', detail: chainId },
            `This session is pinned to chainId ${chainId}, but connect can only read accounts on mainnet and testnet.`,
        )
    }

    if (network && sessionNetwork && network !== sessionNetwork) {
        throw new PeraWalletConnectError(
            {
                type: 'SIGN_DATA_NETWORK_MISMATCH',
                detail: { network, chainId },
            },
            `This session is pinned to ${sessionNetwork} (chainId ${chainId}); the wallet only serves it there, so the signer cannot be resolved on ${network}.`,
        )
    }

    const resolvedNetwork = network ?? sessionNetwork

    if (!resolvedNetwork) {
        throw new PeraWalletConnectError(
            { type: 'SIGN_DATA_NETWORK_REQUIRED' },
            "resolveArc60Signer needs a network: this session accepts all networks, so pass the network the user's wallet is on.",
        )
    }

    return resolvedNetwork
}

async function lookupArc60Signer(
    algod: algosdk.Algodv2,
    accountAddress: string,
    network: PeraWalletNetwork,
): Promise<PeraWalletArc60SignerResolution> {
    let authAddr: string | null

    try {
        // Header only: the full record fails with "Result limit exceeded" for
        // accounts holding more resources than algod's per-account cap, and
        // auth-addr is part of the header.
        const accountInfo = await algod
            .accountInformation(accountAddress)
            .exclude('all')
            .do()

        authAddr = accountInfo.authAddr ? String(accountInfo.authAddr) : null
    } catch (error) {
        throw new PeraWalletConnectError(
            { type: 'SIGN_DATA_AUTH_ADDR_LOOKUP_FAILED', detail: error },
            `Could not read the auth address of ${accountAddress} on ${network}.`,
            { cause: error },
        )
    }

    const signerAddress = authAddr ?? accountAddress

    return {
        accountAddress,
        signerAddress,
        signer: algosdk.decodeAddress(signerAddress).publicKey,
        isRekeyed: authAddr !== null,
        network,
    }
}

function assertValidArc60Account(accountAddress: string) {
    if (!algosdk.isValidAddress(accountAddress)) {
        throw new PeraWalletConnectError(
            { type: 'SIGN_DATA_INVALID_ADDRESS' },
            `"${accountAddress}" is not a valid Algorand address.`,
        )
    }
}

export {
    assertArc60DomainMatchesOrigin,
    assertValidArc60Account,
    lookupArc60Signer,
    resolveArc60SignerNetwork,
}
