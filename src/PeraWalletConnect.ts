import WalletConnect from '@perawallet/walletconnect'
import algosdk, { type TransactionSigner } from 'algosdk'

import {
    createPeraWalletConnectQrcodeModal,
    PERA_WALLET_CONNECT_MODAL_ID,
    PERA_WALLET_EXTENSION_CONNECT_EVENT,
    removeModalWrapperFromDOM,
    setupPeraWalletConnectModalCloseListener,
} from './modal/peraWalletConnectModalUtils.js'
import {
    buildArc60SignDataResponse,
    decodeArc60SignedData,
} from './transport/arc60Wire.js'
import {
    ExtensionTransport,
    getPeraNetworkFromChainId,
} from './transport/extension/ExtensionTransport.js'
import {
    getPeraProvider,
    type PeraNetwork,
} from './transport/extension/peraProviderTypes.js'
import {
    MobileTransport,
    requestEmptySignatures,
} from './transport/MobileTransport.js'
import {
    type ConnectOptions,
    type WalletTransport,
} from './transport/WalletTransport.js'
import { WebTransport } from './transport/WebTransport.js'
import { AlgodClientPool } from './util/algod/algod.js'
import { ALGORAND_NODE_CHAIN_ID } from './util/algod/algodConstants.js'
import { type AlgodClients } from './util/algod/algodTypes.js'
import {
    assertValidAlgodClients,
    getNetworkFromChainId,
} from './util/algod/algodUtils.js'
import { getPeraConnectConfig } from './util/api/peraWalletConnectApi.js'
import {
    assertArc60DomainMatchesOrigin,
    assertValidArc60Account,
    lookupArc60Signer,
    resolveArc60SignerNetwork,
} from './util/arc60/arc60Signer.js'
import { runWebConnectFlow } from './util/connect/connectFlow.js'
import { isMobile, isPeraDiscoverBrowser } from './util/device/deviceUtils.js'
import {
    assertEmptySignaturesNetwork,
    EMPTY_SIGNATURES_CAIP2_CHAIN_IDS,
    filterEmptySignatures,
    resolveEmptySignaturesNetwork,
} from './util/emptySignatures.js'
import { getErrorMessage } from './util/error/errorUtils.js'
import {
    SessionEventEmitter,
    type PeraWalletConnectEvent,
    type PeraWalletConnectEventHandler,
} from './util/events/SessionEventEmitter.js'
import {
    type PeraWalletArbitraryData,
    type PeraWalletArc60SignData,
    type PeraWalletArc60SignDataResponse,
    type PeraWalletArc60SignerResolution,
    type PeraWalletNetwork,
    type PeraWalletTransaction,
    type SignerTransaction,
    type SignMetadata,
} from './util/model/peraWalletModels.js'
import { PeraWalletConnectError } from './util/PeraWalletConnectError.js'
import { PERA_WALLET_CONNECT_FALLBACK_BRIDGE } from './util/peraWalletConstants.js'
import { type AlgorandChainIDs } from './util/peraWalletTypes.js'
import {
    verifyArc60Signature,
    verifyPeraSignature,
} from './util/signature/signatureVerification.js'
import { PERA_WALLET_LOCAL_STORAGE_KEYS } from './util/storage/storageConstants.js'
import {
    getWalletConnectObjectFromStorage,
    getWalletDetailsFromStorage,
    getWalletPlatformFromStorage,
    migrateLegacyWalletConnectSession,
    resetWalletDetailsFromStorage,
    saveWalletDetailsToStorage,
} from './util/storage/storageUtils.js'
import { assertSignedTransactionsMatch } from './util/transaction/signedTransactionMatch.js'
import {
    buildSignerGroupForIndexes,
    orderSignedByIndexes,
} from './util/transaction/transactionSignerUtils.js'
import { composeTransaction } from './util/transaction/transactionUtils.js'
import { getPublicSettings } from './util/webview-api/webviewApi.js'

interface PeraWalletConnectOptions {
    bridge?: string
    shouldShowSignTxnToast?: boolean
    chainId?: AlgorandChainIDs
    compactMode?: boolean
    singleAccount?: boolean
    /**
     * When the Pera browser extension is installed (`window.pera` is present),
     * the connect modal offers "Connect with Pera Extension" and pre-selects it.
     * Set to `false` to leave the extension out of the modal and only offer the
     * QR / Pera Web options. Defaults to `true`.
     */
    shouldPreferExtension?: boolean
    /**
     * Opts in to experimental features. Nothing is gated behind it at the
     * moment; kept as the opt-in for whatever is experimental next.
     */
    experimental?: boolean
    /**
     * Algod clients connect reads account state with — the auth-address lookups
     * behind `resolveArc60Signer` and `signData` verification. Supply your own to
     * keep those reads on your infrastructure and off the public nodes' rate
     * limits; a network left out keeps the public node.
     *
     * ```ts
     * new PeraWalletConnect({
     *   algod: {
     *     mainnet: new algosdk.Algodv2(MY_TOKEN, "https://my-node.example.com", "")
     *   }
     * })
     * ```
     */
    algod?: AlgodClients
}

class PeraWalletConnect {
    bridge: string
    connector: WalletConnect | null
    shouldShowSignTxnToast: boolean
    isInWebview: boolean
    chainId?: AlgorandChainIDs
    compactMode?: boolean
    singleAccount?: boolean
    shouldPreferExtension: boolean
    experimental: boolean
    private extensionTransport: ExtensionTransport | null
    /** Connectors the SDK has retired; see `abandonConnector()`. */
    private abandonedConnectors = new WeakSet<WalletConnect>()
    private events = new SessionEventEmitter()
    private algodClients: AlgodClientPool
    private configPromise: ReturnType<typeof getPeraConnectConfig>
    private webviewCheckPromise: Promise<boolean>
    private cachedTransactionSigner: TransactionSigner | null = null

    constructor(options?: PeraWalletConnectOptions) {
        if (options?.algod) {
            assertValidAlgodClients(options.algod)
        }

        this.bridge = options?.bridge || ''
        this.connector = null
        this.shouldShowSignTxnToast = options?.shouldShowSignTxnToast ?? true
        this.chainId = options?.chainId
        this.isInWebview = false
        this.compactMode = options?.compactMode || false
        this.singleAccount = options?.singleAccount || false
        this.shouldPreferExtension = options?.shouldPreferExtension ?? true
        this.experimental = options?.experimental || false
        this.algodClients = new AlgodClientPool(options?.algod)
        this.extensionTransport = this.createExtensionTransport()

        // Earlier versions persisted the WalletConnect session under the shared
        // WC v1 default key; move it to Pera's namespaced key before any
        // connector is built so reconnect keeps working across the upgrade.
        migrateLegacyWalletConnectSession()

        // Started eagerly so both have resolved before the user taps Connect;
        // awaiting them inside the tap delays the modal on iOS Safari.
        this.configPromise = getPeraConnectConfig()
        this.webviewCheckPromise = this.checkIsInWebview()
    }

    get platform() {
        return getWalletPlatformFromStorage()
    }

    get isConnected() {
        switch (this.platform) {
            case 'mobile': {
                return !!this.connector
            }
            case 'web':
            case 'extension': {
                return !!getWalletDetailsFromStorage()?.accounts.length
            }
            default: {
                return false
            }
        }
    }

    get isPeraDiscoverBrowser() {
        return isPeraDiscoverBrowser()
    }

    /**
     * Whether the Pera browser extension's provider (`window.pera`) is present
     * on this page. The detection itself is synchronous (the provider is
     * installed before any page script runs, so there is nothing to poll for or
     * wait on); the promise is kept for backwards compatibility.
     */
    isExtensionAvailable(): Promise<boolean> {
        return Promise.resolve(this.extensionTransport !== null)
    }

    /**
     * Subscribe to session events. Returns the unsubscribe function.
     *
     * `disconnect` fires when the wallet ends the session on its side: the user
     * revoked the site from the extension's Connections screen, or the Pera
     * mobile wallet killed the WalletConnect session. `networkChanged` fires
     * when the extension wallet switches network.
     */
    on<E extends PeraWalletConnectEvent>(
        event: E,
        handler: PeraWalletConnectEventHandler<E>,
    ): () => void {
        return this.events.on(event, handler)
    }

    /**
     * Opens the connect modal and resolves with the accounts the user shares.
     * Rejects with `CONNECT_MODAL_CLOSED` when the user closes the modal.
     *
     * `selectedAccount` only applies to Pera Wallet products.
     */
    connect(options?: ConnectOptions): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            void this.runConnect(options, resolve, reject)
        })
    }

    async reconnectSession(): Promise<string[]> {
        let walletDetails: ReturnType<typeof getWalletDetailsFromStorage>

        try {
            walletDetails = getWalletDetailsFromStorage()
        } catch (error) {
            throw await this.failReconnect(error)
        }

        if (!walletDetails) {
            return []
        }

        if (walletDetails.type === 'pera-wallet-web') {
            return this.reconnectWebSession(walletDetails.accounts)
        }

        if (walletDetails.type === 'pera-wallet-extension') {
            return this.reconnectExtensionSession()
        }

        try {
            return await this.reconnectMobileSession()
        } catch (error) {
            throw await this.failReconnect(error)
        }
    }

    async disconnect() {
        if (
            this.isConnected &&
            this.platform === 'extension' &&
            this.extensionTransport
        ) {
            await this.extensionTransport.disconnect()
        }

        if (this.isConnected && this.platform === 'mobile') {
            // Retiring rather than killing directly: this is the SDK's own
            // teardown, and WalletConnect reports `killSession()` through the
            // same `disconnect` event a wallet-side end uses.
            await this.abandonConnector(this.connector)
        }

        await resetWalletDetailsFromStorage()
    }

    /**
     * Releases everything this instance holds: the `window.pera` subscriptions
     * (the provider outlives the page's components, so an undisposed instance is
     * retained for the page's life) and any WalletConnect connector. The wallet
     * session itself is untouched — call `disconnect()` for that.
     *
     * Call it when the component owning the instance unmounts. Under React
     * StrictMode or hot reload, skipping it leaves the discarded instance
     * listening and swallowing the events the live one should handle.
     */
    dispose() {
        this.extensionTransport?.dispose()
        this.extensionTransport = null

        if (this.connector) {
            this.abandonedConnectors.add(this.connector)
            this.connector = null
        }

        this.events.clear()
    }

    verifySignature(
        data: Uint8Array,
        signature: Uint8Array,
        signerAddress: string,
    ): boolean {
        return verifyPeraSignature(data, signature, signerAddress)
    }

    verifyArc60Signature(
        data: Uint8Array,
        authenticatorData: Uint8Array,
        signature: Uint8Array,
        signerAddress: string,
    ): Promise<boolean> {
        return verifyArc60Signature(
            data,
            authenticatorData,
            signature,
            signerAddress,
        )
    }

    async signTransaction(
        txGroups: SignerTransaction[][],
        signerAddress?: string,
    ): Promise<Uint8Array[]> {
        const transport = this.getTransport()
        const txns = txGroups.flat()
        const signTxnRequestParams = txns.map<PeraWalletTransaction>(
            txGroupDetail => composeTransaction(txGroupDetail, signerAddress),
        )

        const result = await transport.signTransaction(signTxnRequestParams)

        // `signers: []` marks a transaction the wallet was told not to sign; it
        // returns only the others, in group order.
        const signableIndices = signTxnRequestParams.flatMap((params, index) =>
            params.signers?.length === 0 ? [] : [index],
        )

        assertSignedTransactionsMatch(
            txns.map(({ txn }) => txn),
            signableIndices,
            result,
        )

        return result
    }

    /**
     * An algosdk `TransactionSigner` backed by this wallet connection, for use
     * with `AtomicTransactionComposer` and any API that accepts a signer:
     *
     *   atc.addTransaction({txn, signer: peraWallet.transactionSigner});
     *
     * The whole group is sent to the wallet in one request; slots not listed in
     * `indexesToSign` are marked `signers: []` (ARC-0001) so the wallet shows
     * but does not sign them. The same function instance is returned on every
     * access: `AtomicTransactionComposer` batches transactions by signer
     * identity, so a fresh function per access would mean one wallet prompt per
     * transaction instead of one per group.
     */
    get transactionSigner(): TransactionSigner {
        this.cachedTransactionSigner ??= async (txnGroup, indexesToSign) => {
            if (indexesToSign.length === 0) {
                return []
            }

            const signerGroup = buildSignerGroupForIndexes(
                txnGroup,
                indexesToSign,
            )
            // Rejects unless exactly the requested slots come back.
            const signed = await this.signTransaction([signerGroup])

            return orderSignedByIndexes(signed, indexesToSign)
        }

        return this.cachedTransactionSigner
    }

    async signData(
        data: PeraWalletArbitraryData[],
        signer: string,
        verifySignature?: boolean,
    ): Promise<Uint8Array[]> {
        const chainId = this.chainId || ALGORAND_NODE_CHAIN_ID
        const transport = this.getTransport()
        const signatures = await transport.signData(data, signer, chainId)

        if (verifySignature) {
            const authAddr = await this.getAccountAuthAddr(signer, chainId)
            const effectiveSigner = authAddr || signer

            signatures.forEach((signature, index) => {
                if (
                    !this.verifySignature(
                        data[index].data,
                        signature,
                        effectiveSigner,
                    )
                ) {
                    throw new PeraWalletConnectError(
                        { type: 'SIGN_DATA_VERIFICATION_FAILED' },
                        `Signature verification failed for data item at index ${index}`,
                    )
                }
            })
        }

        return signatures
    }

    /**
     * Resolves who has to sign an ARC-60 (SIWA) request for `accountAddress`.
     *
     * An ARC-60 signature verifies against `signer`'s own key and the wallet
     * never substitutes another key, so a rekeyed account must be signed for by
     * its on-chain auth address: put the returned `signer` into
     * `PeraWalletArc60SignData` and keep `accountAddress` as the SIWA
     * `account_address`. The wallet refuses a rekeyed account signing for itself,
     * and it can only sign when it holds the auth address as a key-bearing or
     * Ledger account.
     *
     * Rekeys are per network and the wallet checks them on the network it is
     * connected to, which connect cannot observe. A session pinned to `416001`
     * or `416002` is only served while the wallet is on that network, so the
     * lookup uses it and an explicit `network` may only agree with it
     * (`SIGN_DATA_NETWORK_MISMATCH` otherwise). An all-networks session (`4160`,
     * the default) needs `network` (`SIGN_DATA_NETWORK_REQUIRED`) and the caller
     * has to know the wallet's network by other means. Betanet has no algod here
     * (`SIGN_DATA_NETWORK_UNSUPPORTED`). A failed lookup throws
     * `SIGN_DATA_AUTH_ADDR_LOOKUP_FAILED` rather than assuming "not rekeyed".
     */
    async resolveArc60Signer(
        accountAddress: string,
        network?: PeraWalletNetwork,
    ): Promise<PeraWalletArc60SignerResolution> {
        assertValidArc60Account(accountAddress)

        const resolvedNetwork = resolveArc60SignerNetwork(this.chainId, network)

        return lookupArc60Signer(
            this.algodClients.get(resolvedNetwork),
            accountAddress,
            resolvedNetwork,
        )
    }

    /**
     * Each connected account's empty signature, for use-wallet's
     * `WalletAccount.emptySignature` (TxnLab/use-wallet#465): base64 of a
     * `SignedTransaction` without `txn`, which tells the account type and feeds
     * fee simulation. Accounts missing from the result are unknown.
     *
     * Pera Mobile answers over WalletConnect (`algo_getEmptySignatures`) and the
     * Pera extension through `window.pera`, both without prompting the user.
     * Pera Web, and extensions that predate the method, resolve `{}`. Call it
     * right after a fresh `connect()`; a value must come from the wallet just
     * now, never be replayed after `reconnectSession()`.
     *
     * `network` defaults to the one the `chainId` option pins. On Pera Mobile an
     * all-networks session (`4160`, the default) needs it
     * (`EMPTY_SIGNATURES_NETWORK_REQUIRED`); the extension answers for the
     * network it is on and refuses another (`EMPTY_SIGNATURES_NETWORK_MISMATCH`).
     * Rejects with `SESSION_DISCONNECTED`, `EMPTY_SIGNATURES_TIMEOUT` after 30 s
     * (older Pera apps, or iOS suspending Pera), or `EMPTY_SIGNATURES`
     * (`detail.reason`: `"wallet-error"`, `"session-changed"`, `"invalid-result"`).
     */
    async getEmptySignatures(
        network?: PeraNetwork,
    ): Promise<Record<string, string>> {
        assertEmptySignaturesNetwork(network)

        if (this.platform === 'web') {
            return {}
        }

        if (this.platform === 'extension') {
            const extensionTransport = this.requireExtensionTransport()
            const accounts = getWalletDetailsFromStorage()?.accounts || []
            const result = await extensionTransport.getEmptySignatures(
                network || getPeraNetworkFromChainId(this.chainId),
            )

            return filterEmptySignatures(result, accounts)
        }

        const { connector } = this

        if (!connector || !connector.connected) {
            throw new PeraWalletConnectError(
                { type: 'SESSION_DISCONNECTED' },
                'Connect Pera before asking for empty signatures.',
            )
        }

        const resolvedNetwork = resolveEmptySignaturesNetwork(
            network,
            this.chainId,
        )
        // reconnectSession() replaces the connector object for the same
        // session, so a changed session is detected by its peer, not by object
        // identity.
        const { peerId } = connector
        const accounts = [...connector.accounts]

        const result = await requestEmptySignatures(
            connector,
            EMPTY_SIGNATURES_CAIP2_CHAIN_IDS[resolvedNetwork],
        )

        if (!this.connector || this.connector.peerId !== peerId) {
            throw new PeraWalletConnectError(
                {
                    type: 'EMPTY_SIGNATURES',
                    detail: { reason: 'session-changed' },
                },
                'The WalletConnect session changed while waiting for empty signatures.',
            )
        }

        return filterEmptySignatures(result, accounts)
    }

    /**
     * Sign an ARC-60 payload (e.g. an auth request).
     *
     * Sends `algo_signData` with a single object as `params` so the Pera mobile
     * wallet routes it to the ARC-60 handler instead of the legacy
     * arbitrary-data handler. The signature returned is
     * `ed25519(sha256(data) || sha256(authenticatorData))` per ARC-60, not a
     * raw signature over `data`.
     *
     * Resolves with the full ARC-60 `SignDataResponse` shape (signed payload,
     * signer public key, domain, authenticatorData and signature) so responses
     * are interchangeable with use-wallet / lute-connect.
     *
     * Mirrors ARC-60's `signData(signingData, metadata)` signature: `payload`
     * is the spec's `StdSigData` and `metadata` (scope + encoding) is passed
     * separately; the two are unified into one object on the wire.
     *
     * `payload.domain` MUST match the dApp's page origin (SIWA origin binding)
     * on every transport. Connect pre-validates this and throws
     * `SIGN_DATA_DOMAIN_MISMATCH` before contacting the wallet; the extension
     * additionally enforces the same rule independently.
     */
    async signArc60Data(
        payload: PeraWalletArc60SignData,
        metadata: SignMetadata,
        verifySignature?: boolean,
    ): Promise<PeraWalletArc60SignDataResponse> {
        if (this.platform !== 'mobile' && this.platform !== 'extension') {
            throw new Error(
                'ARC-60 signing is only supported via the Pera mobile wallet or the Pera extension.',
            )
        }

        assertArc60DomainMatchesOrigin(payload.domain)

        const transport = this.getTransport()
        const response = await transport.signArc60Data(payload, metadata)

        if (verifySignature) {
            const isValid = await this.verifyArc60Signature(
                decodeArc60SignedData(payload.data, metadata.encoding),
                payload.authenticatorData,
                response.signature,
                algosdk.encodeAddress(payload.signer),
            )

            if (!isValid) {
                throw new PeraWalletConnectError(
                    { type: 'SIGN_DATA_VERIFICATION_FAILED' },
                    'ARC-60 signature verification failed',
                )
            }
        }

        return buildArc60SignDataResponse(payload, response.signature)
    }

    // Settles through `resolve`/`reject` rather than its own promise: the
    // outcome comes from whichever of the QR pairing, Pera Web or the
    // extension button finishes first, long after this function returns.
    private async runConnect(
        options: ConnectOptions | undefined,
        resolveConnect: (accounts: string[]) => void,
        rejectConnect: (error: unknown) => void,
    ) {
        // The extension button's listener is scoped to this connect() call and
        // must go away however the call settles (WalletConnect pairing, Pera
        // Web, modal closed, failure), or a later click would hit a stale one.
        let removeExtensionListener = () => {}
        const resolve = (accounts: string[]) => {
            removeExtensionListener()
            resolveConnect(accounts)
        }
        const reject = (error: unknown) => {
            removeExtensionListener()
            rejectConnect(error)
        }

        try {
            // Retire the previous connector so every connect() starts from
            // scratch, without our own killSession() reaching the dApp as a
            // wallet-side `disconnect` mid-connect.
            await this.abandonConnector(this.connector)

            const config = await this.configPromise

            // Re-primed so the next connect() also skips the fetch.
            this.configPromise = getPeraConnectConfig()

            this.isInWebview = await this.webviewCheckPromise
            this.webviewCheckPromise = this.checkIsInWebview()

            if (config.isWebWalletAvailable) {
                window.onWebWalletConnect = runWebConnectFlow({
                    resolve,
                    reject,
                    webWalletURL: config.webWalletURL,
                    chainId: this.chainId,
                    isCompactMode: this.compactMode,
                })
            }

            const extensionTransport = this.shouldPreferExtension
                ? this.extensionTransport
                : null

            if (extensionTransport) {
                removeExtensionListener = this.listenForExtensionConnect(
                    extensionTransport,
                    options,
                    resolve,
                    reject,
                )
            }

            // Bridge precedence: dApp option, then config.json, then a
            // Pera-hosted fallback for when the config is unreachable or lists
            // no servers. `storageId` namespaces the persisted session so Pera
            // never shares the WalletConnect v1 default key with other wallets
            // on the same origin.
            const connector = new WalletConnect({
                bridge:
                    this.bridge ||
                    config.bridgeURL ||
                    PERA_WALLET_CONNECT_FALLBACK_BRIDGE,
                storageId: PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT,
                qrcodeModal: createPeraWalletConnectQrcodeModal({
                    isWebWalletAvailable: config.isWebWalletAvailable,
                    shouldDisplayNewBadge: config.shouldDisplayNewBadge,
                    shouldUseSound: config.shouldUseSound,
                    compactMode: this.compactMode,
                    promoteMobile: config.promoteMobile,
                    singleAccount: this.singleAccount,
                    selectedAccount: options?.selectedAccount,
                    isInWebview: this.isInWebview,
                    isExtensionEnabled: extensionTransport !== null,
                }),
            })

            this.connector = connector
            this.forwardConnectorDisconnect(connector)

            await connector.createSession({
                chainId: this.chainId || ALGORAND_NODE_CHAIN_ID,
            })

            setupPeraWalletConnectModalCloseListener(
                PERA_WALLET_CONNECT_MODAL_ID,
                () =>
                    reject(
                        new PeraWalletConnectError(
                            { type: 'CONNECT_MODAL_CLOSED' },
                            'Connect modal is closed by user',
                        ),
                    ),
            )

            connector.on('connect', error => {
                if (this.abandonedConnectors.has(connector)) {
                    return
                }

                if (error) {
                    reject(error)

                    return
                }

                resolve(connector.accounts || [])
                saveWalletDetailsToStorage(connector.accounts || [])
            })
        } catch (error) {
            reject(
                new PeraWalletConnectError(
                    { type: 'SESSION_CONNECT', detail: error },
                    getErrorMessage(
                        error,
                        'There was an error while connecting to Pera Wallet',
                    ),
                ),
            )
        }
    }

    // The modal's extension button dispatches this event synchronously from
    // its click handler, and `dispatchEvent` runs listeners synchronously, so
    // `window.pera.connect()` still runs inside the user's gesture (a
    // first-time connect needs that activation). Returns the unsubscribe.
    private listenForExtensionConnect(
        extensionTransport: ExtensionTransport,
        options: ConnectOptions | undefined,
        resolve: (accounts: string[]) => void,
        reject: (error: unknown) => void,
    ) {
        const removeListener = () => {
            document.removeEventListener(
                PERA_WALLET_EXTENSION_CONNECT_EVENT,
                handleExtensionConnect,
            )
        }
        const handleExtensionConnect = () => {
            removeListener()

            // Take the modal down before awaiting the provider. The extension's
            // own approval window owns the flow from here, and leaving our close
            // button live would let the user "cancel" a connect that is already
            // in flight: `connect()` would reject while the later approval still
            // stored the session, so the dApp shows "not connected" and the next
            // page load silently reconnects.
            removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID)

            extensionTransport
                .connect({ selectedAccount: options?.selectedAccount })
                .then(accounts => {
                    // The QR pairing may still be waiting for a scan; retire it
                    // so it cannot overwrite the extension session with a
                    // mobile one.
                    void this.abandonConnector(this.connector)
                    resolve(accounts)
                })
                .catch(reject)
        }

        document.addEventListener(
            PERA_WALLET_EXTENSION_CONNECT_EVENT,
            handleExtensionConnect,
        )

        return removeListener
    }

    private async reconnectWebSession(accounts: string[]) {
        const { isWebWalletAvailable } = await getPeraConnectConfig()

        if (!isWebWalletAvailable) {
            throw new PeraWalletConnectError(
                {
                    type: 'SESSION_RECONNECT',
                    detail: 'Pera Web is not available',
                },
                'Pera Web is not available',
            )
        }

        return accounts || []
    }

    // A gesture-less connect(): the wallet answers at once with the approved
    // accounts, or with "unauthorized", which reconnect() turns into [] after
    // clearing the stale details.
    //
    // Failures pass through instead of going to failReconnect(): that
    // disconnects, which for an extension session means revoking this origin
    // in the wallet. A transient failure (the service worker restarting mid
    // page-load, the wallet on another network) must leave the user's approval
    // and the stored details alone, and the caller gets the transport's own
    // error at `error.data.type`.
    private async reconnectExtensionSession() {
        if (!this.extensionTransport) {
            // The extension was removed (or this is another browser); the
            // wallet owns the connection, so there is nothing to resume.
            await resetWalletDetailsFromStorage()

            return []
        }

        return this.extensionTransport.reconnect()
    }

    // Rebuilds the connector from the persisted WalletConnect session, but
    // answers with the accounts of a connector this instance already held.
    private async reconnectMobileSession() {
        this.isInWebview = await this.checkIsInWebview()

        const previousConnector = this.connector

        this.bridge = getWalletConnectObjectFromStorage()?.bridge || ''

        if (this.bridge) {
            this.connector = new WalletConnect({
                bridge: this.bridge,
                storageId: PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT,
            })
            this.forwardConnectorDisconnect(this.connector)
        }

        return (previousConnector ?? this.connector)?.accounts || []
    }

    // A session that cannot be restored is torn down so the next connect()
    // starts clean.
    private async failReconnect(error: unknown) {
        await this.disconnect()

        return new PeraWalletConnectError(
            { type: 'SESSION_RECONNECT', detail: error },
            getErrorMessage(
                error,
                'There was an error while reconnecting to Pera Wallet',
            ),
        )
    }

    private createExtensionTransport(): ExtensionTransport | null {
        const provider = getPeraProvider()

        if (!provider) {
            return null
        }

        return new ExtensionTransport(provider, {
            chainId: this.chainId,
            onDisconnect: () => this.events.emit('disconnect', undefined),
            onNetworkChanged: params =>
                this.events.emit('networkChanged', params),
        })
    }

    /**
     * The WalletConnect connector reports a wallet-side session end through its
     * own `disconnect` event; mirror it on the SDK so dApps can listen in one
     * place regardless of transport.
     *
     * The event is also how WalletConnect v1 reports *our* `killSession()`, so
     * connectors we have abandoned are filtered out — a dApp must not be told
     * the wallet ended a session that the SDK itself is tearing down.
     */
    private forwardConnectorDisconnect(connector: WalletConnect) {
        connector.on('disconnect', () => {
            if (this.abandonedConnectors.has(connector)) {
                return
            }

            if (this.connector === connector) {
                this.connector = null
            }

            // Another transport may own the current session; only a mobile one
            // is dropped here. Mirrors ExtensionTransport's provider-disconnect
            // handling, so the handler sees cleared state either way.
            if (getWalletPlatformFromStorage() === 'mobile') {
                void resetWalletDetailsFromStorage()
            }

            this.events.emit('disconnect', undefined)
        })
    }

    /**
     * Retires a WalletConnect connector the SDK is done with. WalletConnect v1
     * keeps its listeners for the connector's lifetime and its `off()` drops
     * every listener for an event, so the connector is marked instead and its
     * handlers bail.
     *
     * Without this a QR pairing left in flight by a connect that finished
     * through another transport still fires `connect` when the user finally
     * scans, overwriting the stored session with a mobile one.
     */
    private async abandonConnector(connector: WalletConnect | null) {
        if (!connector) {
            return
        }

        this.abandonedConnectors.add(connector)

        if (this.connector === connector) {
            this.connector = null
        }

        if (connector.connected) {
            try {
                await connector.killSession()
            } catch {
                // Best-effort: the connector is already detached either way.
            }
        }
    }

    private async checkIsInWebview(): Promise<boolean> {
        if (!isMobile()) {
            return false
        }

        try {
            return (await getPublicSettings()) !== null
        } catch {
            return false
        }
    }

    // Legacy signData verification predates per-network sessions and has
    // always read mainnet for an all-networks session; kept for compatibility.
    // A failed lookup falls back to the original signer, so a network hiccup
    // does not fail verification on its own.
    private async getAccountAuthAddr(
        signer: string,
        chainId: AlgorandChainIDs,
    ): Promise<string | null> {
        try {
            const network = getNetworkFromChainId(chainId) ?? 'mainnet'
            const accountInfo = await this.algodClients
                .get(network)
                .accountInformation(signer)
                .do()

            return accountInfo.authAddr ? String(accountInfo.authAddr) : null
        } catch {
            return null
        }
    }

    private requireExtensionTransport() {
        if (!this.extensionTransport) {
            throw new PeraWalletConnectError(
                { type: 'EXTENSION_NOT_AVAILABLE' },
                'The session was created with the Pera extension, but window.pera is not present on this page. Reconnect with another option.',
            )
        }

        return this.extensionTransport
    }

    private getTransport(): WalletTransport {
        if (this.platform === 'extension') {
            return this.requireExtensionTransport()
        }

        if (this.platform === 'web') {
            return new WebTransport({
                getWebWalletURL: async () =>
                    (await getPeraConnectConfig()).webWalletURL,
            })
        }

        // `connector` is a public field, so it holds whatever a dApp assigned;
        // fail here rather than mid-signing.
        if (!this.connector?.sendCustomRequest) {
            throw new Error('PeraWalletConnect was not initialized correctly.')
        }

        return new MobileTransport({
            connector: this.connector,
            shouldShowSignTxnToast: this.shouldShowSignTxnToast,
            isInWebview: this.isInWebview,
            getSilent: async () => (await getPeraConnectConfig()).silent,
        })
    }
}

export { PeraWalletConnect, type PeraWalletConnectOptions }
