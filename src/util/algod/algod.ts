import type algosdk from 'algosdk'

import { type AlgodClients, type NetworkToggle } from './algodTypes'
import { createDefaultAlgodClient } from './algodUtils'

// One client per network, built on first use: the integrator's when supplied,
// otherwise a public node.
class AlgodClientPool {
    private clients = new Map<NetworkToggle, algosdk.Algodv2>()

    constructor(private readonly suppliedClients: AlgodClients = {}) {}

    get(network: NetworkToggle): algosdk.Algodv2 {
        let client = this.clients.get(network)

        if (!client) {
            client =
                this.suppliedClients[network] ??
                createDefaultAlgodClient(network)
            this.clients.set(network, client)
        }

        return client
    }
}

export { AlgodClientPool }
