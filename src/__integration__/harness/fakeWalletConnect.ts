import { vi } from 'vitest'

// A stand-in for `@perawallet/walletconnect` (WalletConnect v1) that keeps the
// behaviour the SDK depends on: `createSession()` hands the pairing URI to the
// `qrcodeModal`, `connect` closes that modal before user handlers run, the
// session is persisted under `storageId` and restored from it by a connector
// built later, and a rejected pairing, a `killSession()` and a wallet-side end
// all surface as `disconnect`. Requests travel through `walletConnectRelay`
// (the bridge server) to whichever fake wallet answers them.

type EventHandler = (error: Error | null, payload: unknown) => void

export interface QrcodeModal {
    open: (uri: string, onClose?: () => void) => void
    close: () => void
}

interface ConnectorOptions {
    bridge?: string
    storageId?: string
    qrcodeModal?: QrcodeModal
}

export interface JsonRpcRequest {
    id: number
    jsonrpc: string
    method: string
    params: unknown
}

export interface RequestOptions {
    forcePushNotification?: boolean
}

export interface RelayedRequest {
    connector: FakeWalletConnect
    request: JsonRpcRequest
    options?: RequestOptions
    resolve: (result: unknown) => void
    reject: (error: Error) => void
}

interface StoredSession {
    connected: boolean
    accounts: string[]
    chainId: number
    bridge: string
    key: string
    clientId: string
    peerId: string
    handshakeTopic: string
}

class WalletConnectRelay {
    readonly connectors: FakeWalletConnect[] = []
    readonly requests: RelayedRequest[] = []
    private pairingCount = 0

    latestConnector(): FakeWalletConnect | undefined {
        return this.connectors.at(-1)
    }

    /** The connector that published `uri` (the modal appends its own params). */
    findByUri(uri: string): FakeWalletConnect | undefined {
        const [pairingTopic] = uri.split('?')

        return this.connectors.find(
            connector => connector.uri.split('?')[0] === pairingTopic,
        )
    }

    nextPairingId() {
        this.pairingCount += 1

        return this.pairingCount
    }

    reset() {
        this.connectors.length = 0
        this.requests.length = 0
        this.pairingCount = 0
    }
}

export const walletConnectRelay = new WalletConnectRelay()

export class FakeWalletConnect {
    readonly bridge: string
    readonly storageId: string
    readonly qrcodeModal: QrcodeModal | undefined
    readonly killSession = vi.fn(async () => {
        this.handleSessionDisconnect('Session Disconnected')
    })

    connected = false
    accounts: string[] = []
    chainId = 0
    peerId = ''
    uri = ''
    private key = ''
    private clientId = ''
    private handshakeTopic = ''
    private handlers = new Map<string, EventHandler[]>()

    constructor(options: ConnectorOptions) {
        if (!options.bridge) {
            throw new Error(
                'Missing one of the required parameters: bridge / uri / session',
            )
        }

        this.bridge = options.bridge
        this.storageId = options.storageId || 'walletconnect'
        this.qrcodeModal = options.qrcodeModal

        this.restoreStoredSession()

        // WalletConnect subscribes this before any user handler, so the modal
        // is gone by the time the dApp's `connect` listener runs.
        this.on('connect', () => this.qrcodeModal?.close())

        walletConnectRelay.connectors.push(this)
    }

    on(event: string, callback: EventHandler) {
        this.handlers.set(event, [
            ...(this.handlers.get(event) || []),
            callback,
        ])
    }

    async createSession(options?: { chainId?: number }) {
        if (this.connected) {
            throw new Error('Session currently connected')
        }

        const pairingId = walletConnectRelay.nextPairingId()

        this.chainId = options?.chainId ?? 0
        this.handshakeTopic = `pairing-${pairingId}`
        this.clientId = `client-${pairingId}`
        this.key = pairingId.toString(16).padStart(64, '0')
        this.uri = `wc:${this.handshakeTopic}@1?bridge=${encodeURIComponent(
            this.bridge,
        )}&key=${this.key}`

        this.qrcodeModal?.open(this.uri, () => this.trigger('modal_closed'))
    }

    async sendCustomRequest(
        request: JsonRpcRequest,
        options?: RequestOptions,
    ): Promise<unknown> {
        if (!this.connected) {
            throw new Error('Session currently disconnected')
        }

        return new Promise((resolve, reject) => {
            walletConnectRelay.requests.push({
                connector: this,
                request,
                options,
                resolve,
                reject,
            })
        })
    }

    // Wallet side, reached through the bridge.

    approveSession({
        accounts,
        peerId,
    }: {
        accounts: string[]
        peerId: string
    }) {
        this.connected = true
        this.accounts = accounts
        this.peerId = peerId
        this.persistSession()
        this.trigger('connect', null, {
            params: [{ peerId, chainId: this.chainId, accounts }],
        })
    }

    rejectSession(message = 'Session Rejected') {
        this.handleSessionDisconnect(message)
    }

    endSessionFromWallet() {
        this.handleSessionDisconnect('Session Disconnected')
    }

    private handleSessionDisconnect(message: string) {
        if (!this.connected) {
            this.qrcodeModal?.close()
        }

        this.connected = false
        this.peerId = ''
        this.trigger('disconnect', null, { params: [{ message }] })
        localStorage.removeItem(this.storageId)
    }

    private trigger(
        event: string,
        error: Error | null = null,
        payload: unknown = null,
    ) {
        for (const handler of this.handlers.get(event) || []) {
            handler(error, payload)
        }
    }

    private persistSession() {
        const session: StoredSession = {
            connected: this.connected,
            accounts: this.accounts,
            chainId: this.chainId,
            bridge: this.bridge,
            key: this.key,
            clientId: this.clientId,
            peerId: this.peerId,
            handshakeTopic: this.handshakeTopic,
        }

        localStorage.setItem(this.storageId, JSON.stringify(session))
    }

    private restoreStoredSession() {
        const raw = localStorage.getItem(this.storageId)

        if (!raw) {
            return
        }

        const session = JSON.parse(raw) as StoredSession

        this.connected = session.connected
        this.accounts = session.accounts
        this.chainId = session.chainId
        this.key = session.key
        this.clientId = session.clientId
        this.peerId = session.peerId
        this.handshakeTopic = session.handshakeTopic
    }
}
