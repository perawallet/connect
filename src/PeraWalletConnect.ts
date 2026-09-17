/* eslint-disable max-lines */
import WalletConnect from "@perawallet/walletconnect";
import algosdk, {type TransactionSigner} from "algosdk";
import {sign_detached_verify} from "tweetnacl-ts";

import PeraWalletConnectError from "./util/PeraWalletConnectError";
import {
  openPeraWalletConnectModal,
  removeModalWrapperFromDOM,
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_EXTENSION_CONNECT_EVENT,
  PeraWalletModalConfig,
  setupPeraWalletConnectModalCloseListener
} from "./modal/peraWalletConnectModalUtils";
import {
  getWalletDetailsFromStorage,
  resetWalletDetailsFromStorage,
  saveWalletDetailsToStorage,
  getWalletConnectObjectFromStorage,
  getWalletPlatformFromStorage,
  migrateLegacyWalletConnectSession
} from "./util/storage/storageUtils";
import {PERA_WALLET_LOCAL_STORAGE_KEYS} from "./util/storage/storageConstants";
import {getPeraConnectConfig} from "./util/api/peraWalletConnectApi";
import {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  PeraWalletArc60SignerResolution,
  PeraWalletNetwork,
  PeraWalletTransaction,
  SignerTransaction,
  SignMetadata
} from "./util/model/peraWalletModels";
import {composeTransaction} from "./util/transaction/transactionUtils";
import {isMobile} from "./util/device/deviceUtils";
import {AlgorandChainIDs} from "./util/peraWalletTypes";
import {runWebConnectFlow} from "./util/connect/connectFlow";
import {concatArrays} from "./util/array/arrayUtils";
import {AlgodManager} from "./util/algod/algod";
import {
  ALGORAND_NODE_CHAIN_ID,
  DEFAULT_ALGORAND_NODE_PROVIDER_TYPE
} from "./util/algod/algodConstants";
import {NetworkToggle} from "./util/algod/algodTypes";
import {getNetworkFromChainId} from "./util/algod/algodUtils";
import {PERA_WALLET_SIGNATURE_PREFIX} from "./util/peraWalletConstants";
import {getPublicSettings} from "./util/webview-api/webviewApi";
import {ExtensionTransport} from "./transport/extension/ExtensionTransport";
import {getPeraProvider, PeraNetwork} from "./transport/extension/peraProviderTypes";
import {isArc60OriginMismatch} from "./transport/extension/originBinding";
import {MobileTransport} from "./transport/MobileTransport";
import {WebTransport} from "./transport/WebTransport";
import {ConnectOptions} from "./transport/WalletTransport";
import {buildArc60SignDataResponse, decodeArc60SignedData} from "./transport/arc60Wire";

interface PeraWalletConnectOptions {
  bridge?: string;
  shouldShowSignTxnToast?: boolean;
  chainId?: AlgorandChainIDs;
  compactMode?: boolean;
  singleAccount?: boolean;
  /**
   * When the Pera browser extension is installed (`window.pera` is present),
   * the connect modal offers "Connect with Pera Extension" and pre-selects it.
   * Set to `false` to leave the extension out of the modal and only offer the
   * QR / Pera Web options. Defaults to `true`.
   */
  shouldPreferExtension?: boolean;
  /**
   * Opts in to experimental features. Nothing is gated behind it at the
   * moment: browser-extension support used to be, and is now on by default
   * whenever `window.pera` is present. Kept as the opt-in for whatever is
   * experimental next.
   */
  experimental?: boolean;
}

type PeraWalletConnectEventMap = {
  /** The session ended from the wallet side (for example the user revoked the site). */
  disconnect: undefined;
  /** The wallet switched network (extension only). */
  networkChanged: {network: PeraNetwork};
};

type PeraWalletConnectEvent = keyof PeraWalletConnectEventMap;
type PeraWalletConnectEventHandler<E extends PeraWalletConnectEvent> = (
  payload: PeraWalletConnectEventMap[E]
) => void;

function generatePeraWalletConnectModalActions({
  isWebWalletAvailable,
  shouldDisplayNewBadge,
  shouldUseSound,
  compactMode,
  promoteMobile,
  singleAccount,
  selectedAccount,
  isInWebview,
  isExtensionEnabled
}: PeraWalletModalConfig) {
  return {
    open: openPeraWalletConnectModal({
      isWebWalletAvailable,
      shouldDisplayNewBadge,
      shouldUseSound,
      compactMode,
      promoteMobile,
      singleAccount,
      selectedAccount,
      isInWebview,
      isExtensionEnabled
    }),
    close: () => removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID)
  };
}

class PeraWalletConnect {
  bridge: string;
  connector: WalletConnect | null;
  shouldShowSignTxnToast: boolean;
  isInWebview: boolean;
  chainId?: AlgorandChainIDs;
  compactMode?: boolean;
  singleAccount?: boolean;
  shouldPreferExtension: boolean;
  experimental: boolean;
  private extensionTransport: ExtensionTransport | null;
  /** Connectors the SDK has retired; see `abandonConnector()`. */
  private abandonedConnectors = new WeakSet<WalletConnect>();
  private eventHandlers: {
    [E in PeraWalletConnectEvent]: Set<PeraWalletConnectEventHandler<E>>;
  } = {
    disconnect: new Set(),
    networkChanged: new Set()
  };
  private algodClients: Map<NetworkToggle, AlgodManager>;
  private _configPromise: ReturnType<typeof getPeraConnectConfig> | null = null;
  private _webviewCheckPromise: Promise<boolean> | null = null;
  private _transactionSigner: TransactionSigner | null = null;

  constructor(options?: PeraWalletConnectOptions) {
    this.bridge = options?.bridge || "";

    this.connector = null;
    this.shouldShowSignTxnToast =
      typeof options?.shouldShowSignTxnToast === "undefined"
        ? true
        : options.shouldShowSignTxnToast;

    this.chainId = options?.chainId;
    this.isInWebview = false;
    this.compactMode = options?.compactMode || false;
    this.singleAccount = options?.singleAccount || false;
    this.algodClients = new Map();
    this.shouldPreferExtension =
      typeof options?.shouldPreferExtension === "undefined"
        ? true
        : options.shouldPreferExtension;
    this.experimental = options?.experimental || false;
    this.extensionTransport = this.createExtensionTransport();

    // Earlier versions persisted the WalletConnect session under the shared
    // WC v1 default key; move it to Pera's namespaced key before any connector
    // is built so reconnect keeps working across the upgrade.
    migrateLegacyWalletConnectSession();

    // Eagerly start the two blocking operations so they resolve
    // before the user taps Connect — avoids delay on iOS Safari.
    this._configPromise = getPeraConnectConfig();
    this._webviewCheckPromise = this.checkIsInWebview();
  }

  get platform() {
    return getWalletPlatformFromStorage();
  }

  /**
   * Whether the Pera browser extension's provider (`window.pera`) is present
   * on this page. The detection itself is synchronous (the provider is
   * installed before any page script runs, so there is nothing to poll for or
   * wait on); the promise is kept for backwards compatibility.
   */
  isExtensionAvailable(): Promise<boolean> {
    return Promise.resolve(this.extensionTransport !== null);
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
    handler: PeraWalletConnectEventHandler<E>
  ): () => void {
    const handlers = this.eventHandlers[event] as Set<PeraWalletConnectEventHandler<E>>;

    handlers.add(handler);

    return () => {
      handlers.delete(handler);
    };
  }

  private emit<E extends PeraWalletConnectEvent>(
    event: E,
    payload: PeraWalletConnectEventMap[E]
  ) {
    const handlers = this.eventHandlers[event] as Set<PeraWalletConnectEventHandler<E>>;

    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch {
        // A faulty listener must not break the others or the SDK.
      }
    });
  }

  private createExtensionTransport(): ExtensionTransport | null {
    const provider = getPeraProvider();

    if (!provider) {
      return null;
    }

    return new ExtensionTransport(provider, {
      chainId: this.chainId,
      onDisconnect: () => this.emit("disconnect", undefined),
      onNetworkChanged: (params) => this.emit("networkChanged", params)
    });
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
    connector.on("disconnect", () => {
      if (this.abandonedConnectors.has(connector)) {
        return;
      }

      if (this.connector === connector) {
        this.connector = null;
      }

      // Another transport may own the current session; only a mobile one is
      // dropped here. Mirrors ExtensionTransport.handleProviderDisconnect(),
      // so the handler sees cleared state either way.
      if (getWalletPlatformFromStorage() === "mobile") {
        resetWalletDetailsFromStorage();
      }

      this.emit("disconnect", undefined);
    });
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
      return;
    }

    this.abandonedConnectors.add(connector);

    if (this.connector === connector) {
      this.connector = null;
    }

    if (connector.connected) {
      try {
        await connector.killSession();
      } catch (_error) {
        // Best-effort: the connector is already detached either way.
      }
    }
  }

  get isConnected() {
    if (this.platform === "mobile") {
      return !!this.connector;
    } else if (this.platform === "web") {
      return !!getWalletDetailsFromStorage()?.accounts.length;
    } else if (this.platform === "extension") {
      return !!getWalletDetailsFromStorage()?.accounts.length;
    }

    return false;
  }

  get isPeraDiscoverBrowser() {
    return this.checkIsPeraDiscoverBrowser();
  }

  private async checkIsInWebview(): Promise<boolean> {
    if (isMobile()) {
      try {
        const publicSettings = await getPublicSettings();

        return publicSettings !== null;
      } catch {
        return false;
      }
    }

    return false;
  }

  // `selectedAccount` option is only applicable for Pera Wallet products
  connect(options?: ConnectOptions) {
    return new Promise<string[]>(async (resolveConnect, rejectConnect) => {
      // The extension button's listener is scoped to this connect() call and
      // must go away however the call settles (WalletConnect pairing, Pera
      // Web, modal closed, failure), or a later click would hit a stale one.
      let removeExtensionListener = () => {
        // no listener registered
      };
      const resolve = (accounts: string[]) => {
        removeExtensionListener();
        resolveConnect(accounts);
      };
      const reject = (error: unknown) => {
        removeExtensionListener();
        rejectConnect(error);
      };

      try {
        // Retire the previous connector before creating a new one, so the user
        // starts from scratch on every `.connect()` call. Going through
        // `abandonConnector()` keeps our own `killSession()` from reaching the
        // dApp as a wallet-side `disconnect` mid-connect.
        await this.abandonConnector(this.connector);

        const {
          isWebWalletAvailable,
          bridgeURL,
          webWalletURL,
          shouldDisplayNewBadge,
          shouldUseSound,
          promoteMobile
        } = await (this._configPromise ?? getPeraConnectConfig());

        // Re-prime for next connect() call so it also benefits from prefetching
        this._configPromise = getPeraConnectConfig();

        this.isInWebview = await (this._webviewCheckPromise ?? this.checkIsInWebview());
        this._webviewCheckPromise = this.checkIsInWebview();

        const onWebWalletConnect = runWebConnectFlow({
          resolve,
          reject,
          webWalletURL,
          chainId: this.chainId,
          isCompactMode: this.compactMode
        });

        if (isWebWalletAvailable) {
          // @ts-ignore ts-2339
          window.onWebWalletConnect = onWebWalletConnect;
        }

        const extensionTransport = this.shouldPreferExtension
          ? this.extensionTransport
          : null;

        if (extensionTransport) {
          // The modal's extension button dispatches this event synchronously
          // from its click handler, and `dispatchEvent` runs listeners
          // synchronously, so `window.pera.connect()` below still runs inside
          // the user's gesture (a first-time connect needs that activation).
          const handleExtensionConnect = () => {
            removeExtensionListener();

            // Take the modal down before awaiting the provider. The extension's
            // own approval window owns the flow from here, and leaving our close
            // button live would let the user "cancel" a connect that is already
            // in flight: `connect()` would reject while the later approval still
            // stored the session, so the dApp shows "not connected" and the next
            // page load silently reconnects.
            removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);

            extensionTransport
              .connect({selectedAccount: options?.selectedAccount})
              .then((accounts) => {
                // The QR pairing may still be waiting for a scan; retire it so
                // it cannot overwrite the extension session with a mobile one.
                this.abandonConnector(this.connector);
                resolve(accounts);
              })
              .catch(reject);
          };

          document.addEventListener(
            PERA_WALLET_EXTENSION_CONNECT_EVENT,
            handleExtensionConnect
          );
          removeExtensionListener = () => {
            document.removeEventListener(
              PERA_WALLET_EXTENSION_CONNECT_EVENT,
              handleExtensionConnect
            );
          };
        }

        // Create Connector instance.
        // `storageId` namespaces the persisted session so Pera never shares the
        // WalletConnect v1 default key with other wallets on the same origin.
        this.connector = new WalletConnect({
          bridge: this.bridge || bridgeURL || "https://bridge.walletconnect.org",
          storageId: PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT,
          qrcodeModal: generatePeraWalletConnectModalActions({
            isWebWalletAvailable,
            shouldDisplayNewBadge,
            shouldUseSound,
            compactMode: this.compactMode,
            promoteMobile,
            singleAccount: this.singleAccount,
            selectedAccount: options?.selectedAccount,
            isInWebview: this.isInWebview,
            isExtensionEnabled: extensionTransport !== null
          })
        });

        this.forwardConnectorDisconnect(this.connector);

        await this.connector.createSession({
          // eslint-disable-next-line no-magic-numbers
          chainId: this.chainId || 4160
        });

        setupPeraWalletConnectModalCloseListener(PERA_WALLET_CONNECT_MODAL_ID, () =>
          reject(
            new PeraWalletConnectError(
              {
                type: "CONNECT_MODAL_CLOSED"
              },
              "Connect modal is closed by user"
            )
          )
        );

        const {connector} = this;

        connector.on("connect", (error, _payload) => {
          if (this.abandonedConnectors.has(connector)) {
            return;
          }

          if (error) {
            reject(error);
          }

          resolve(connector.accounts || []);

          saveWalletDetailsToStorage(connector.accounts || []);
        });
      } catch (error: any) {
        reject(
          new PeraWalletConnectError(
            {
              type: "SESSION_CONNECT",
              detail: error
            },
            error.message || `There was an error while connecting to Pera Wallet`
          )
        );
      }
    });
  }

  reconnectSession() {
    return new Promise<string[]>(async (resolve, reject) => {
      try {
        const walletDetails = getWalletDetailsFromStorage();

        if (!walletDetails) {
          resolve([]);

          return;
        }

        // ================================================= //
        // Pera Wallet Web flow
        if (walletDetails?.type === "pera-wallet-web") {
          const {isWebWalletAvailable} = await getPeraConnectConfig();

          if (isWebWalletAvailable) {
            resolve(walletDetails.accounts || []);
          } else {
            reject(
              new PeraWalletConnectError(
                {
                  type: "SESSION_RECONNECT",
                  detail: "Pera Web is not available"
                },
                "Pera Web is not available"
              )
            );
          }
        }

        if (walletDetails?.type === "pera-wallet-extension") {
          if (!this.extensionTransport) {
            // The extension was removed (or this is another browser); the
            // wallet owns the connection, so there is nothing to resume.
            await resetWalletDetailsFromStorage();
            resolve([]);

            return;
          }

          // A gesture-less connect(): the wallet answers at once with the
          // approved accounts, or with "unauthorized", which reconnect()
          // turns into [] after clearing the stale details.
          //
          // Anything else (the service worker restarting mid page-load, the
          // wallet sitting on another network) is settled here rather than in
          // the catch-all below: that catch disconnects, which for an
          // extension session means revoking this origin in the wallet. The
          // approval is the user's to give and take, so a transient failure
          // must leave it — and the stored details — alone. Rejecting with the
          // transport's own error also keeps the cause at `error.data.type`
          // instead of burying it under a second SESSION_RECONNECT wrapper.
          try {
            resolve(await this.extensionTransport.reconnect());
          } catch (error) {
            reject(error);
          }

          return;
        }

        // Pera Mobile Wallet flow
        this.isInWebview = await this.checkIsInWebview();

        if (this.connector) {
          resolve(this.connector.accounts || []);
        }

        this.bridge = getWalletConnectObjectFromStorage()?.bridge || "";

        if (this.bridge) {
          this.connector = new WalletConnect({
            bridge: this.bridge,
            storageId: PERA_WALLET_LOCAL_STORAGE_KEYS.WALLETCONNECT
          });

          this.forwardConnectorDisconnect(this.connector);

          resolve(this.connector?.accounts || []);
        }

        // If there is no wallet details in storage, resolve the promise with empty array
        if (!this.isConnected) {
          resolve([]);
        }
      } catch (error: any) {
        // If the bridge is not active, then disconnect
        await this.disconnect();

        reject(
          new PeraWalletConnectError(
            {
              type: "SESSION_RECONNECT",
              detail: error
            },
            error.message || `There was an error while reconnecting to Pera Wallet`
          )
        );
      }
    });
  }

  async disconnect() {
    if (this.isConnected && this.platform === "extension" && this.extensionTransport) {
      await this.extensionTransport.disconnect();
    }

    if (this.isConnected && this.platform === "mobile") {
      // Retiring rather than killing directly: this is the SDK's own teardown,
      // and WalletConnect reports `killSession()` through the same `disconnect`
      // event a wallet-side end uses.
      await this.abandonConnector(this.connector);
    }

    await resetWalletDetailsFromStorage();
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
    this.extensionTransport?.dispose();
    this.extensionTransport = null;

    if (this.connector) {
      this.abandonedConnectors.add(this.connector);
      this.connector = null;
    }

    this.eventHandlers.disconnect.clear();
    this.eventHandlers.networkChanged.clear();
  }

  verifySignature(
    data: Uint8Array,
    signature: Uint8Array,
    signerAddress: string
  ): boolean {
    try {
      const {publicKey} = algosdk.decodeAddress(signerAddress);
      const toBeVerified = concatArrays(PERA_WALLET_SIGNATURE_PREFIX, data);

      return sign_detached_verify(toBeVerified, signature, publicKey);
    } catch (error) {
      return false;
    }
  }

  async verifyArc60Signature(
    data: Uint8Array,
    authenticatorData: Uint8Array,
    signature: Uint8Array,
    signerAddress: string
  ): Promise<boolean> {
    try {
      const {publicKey} = algosdk.decodeAddress(signerAddress);
      const dataHash = new Uint8Array(
        await crypto.subtle.digest("SHA-256", Buffer.from(data))
      );
      const authHash = new Uint8Array(
        await crypto.subtle.digest("SHA-256", Buffer.from(authenticatorData))
      );
      const toBeVerified = concatArrays(dataHash, authHash);

      return sign_detached_verify(toBeVerified, signature, publicKey);
    } catch (error) {
      return false;
    }
  }

  private checkIsPeraDiscoverBrowser() {
    const userAget = window.navigator.userAgent;

    return userAget.includes("pera");
  }

  private getAlgodClient(network: NetworkToggle): AlgodManager {
    if (!this.algodClients.has(network)) {
      const algodClient = new AlgodManager({
        network,
        providerType: DEFAULT_ALGORAND_NODE_PROVIDER_TYPE
      });

      this.algodClients.set(network, algodClient);
    }

    return this.algodClients.get(network)!;
  }

  private async getAccountAuthAddr(
    signer: string,
    chainId: AlgorandChainIDs
  ): Promise<string | null> {
    try {
      // Legacy signData verification predates per-network sessions and has
      // always read mainnet for an all-networks session; kept for compatibility.
      const network = getNetworkFromChainId(chainId) ?? "mainnet";
      const algodClient = this.getAlgodClient(network);
      const accountInfo = await algodClient.client.accountInformation(signer).do();

      return accountInfo.authAddr ? String(accountInfo.authAddr) : null;
    } catch (error) {
      // If account fetch fails, return null to fall back to using the original signer
      // This ensures signing can proceed even if there's a network issue
      return null;
    }
  }

  private getTransport() {
    if (this.platform === "extension") {
      if (!this.extensionTransport) {
        throw new PeraWalletConnectError(
          {type: "EXTENSION_NOT_AVAILABLE"},
          "The session was created with the Pera extension, but window.pera is not present on this page. Reconnect with another option."
        );
      }

      return this.extensionTransport;
    }

    if (this.platform === "web") {
      return new WebTransport({
        getWebWalletURL: async () => {
          const config = await getPeraConnectConfig();

          return config.webWalletURL;
        }
      });
    }

    if (!this.connector || !this.connector.sendCustomRequest) {
      throw new Error("PeraWalletConnect was not initialized correctly.");
    }

    return new MobileTransport({
      connector: this.connector as any,
      shouldShowSignTxnToast: this.shouldShowSignTxnToast,
      isInWebview: this.isInWebview,
      getSilent: async () => {
        const {silent} = await getPeraConnectConfig();

        return silent;
      }
    });
  }

  async signTransaction(
    txGroups: SignerTransaction[][],
    signerAddress?: string
  ): Promise<Uint8Array[]> {
    const transport = this.getTransport();

    // Prepare transactions to be sent to wallet
    const signTxnRequestParams = txGroups.flatMap((txGroup) =>
      txGroup.map<PeraWalletTransaction>((txGroupDetail) =>
        composeTransaction(txGroupDetail, signerAddress)
      )
    );

    const result = await transport.signTransaction(signTxnRequestParams);

    return result;
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
    if (!this._transactionSigner) {
      this._transactionSigner = (txnGroup, indexesToSign) =>
        this.signTransactionGroupForIndexes(txnGroup, indexesToSign);
    }

    return this._transactionSigner;
  }

  private async signTransactionGroupForIndexes(
    txnGroup: algosdk.Transaction[],
    indexesToSign: number[]
  ): Promise<Uint8Array[]> {
    if (indexesToSign.length === 0) {
      return [];
    }

    // Validate before the round-trip so a bad caller never triggers a wallet
    // prompt for the wrong slots and then fails on the count check.
    const hasInvalidIndex = indexesToSign.some(
      (index, position) =>
        !Number.isInteger(index) ||
        index < 0 ||
        index >= txnGroup.length ||
        indexesToSign.indexOf(index) !== position
    );

    if (hasInvalidIndex) {
      const received = JSON.stringify(indexesToSign);

      throw new PeraWalletConnectError(
        {
          type: "SIGN_TRANSACTIONS",
          detail: {indexesToSign, groupLength: txnGroup.length}
        },
        `Invalid indexesToSign ${received}: expected unique integers below ${txnGroup.length}`
      );
    }

    const txGroup: SignerTransaction[] = txnGroup.map((txn, index) =>
      indexesToSign.includes(index) ? {txn} : {txn, signers: []}
    );

    const signed = await this.signTransaction([txGroup]);

    if (signed.length !== indexesToSign.length) {
      throw new PeraWalletConnectError(
        {
          type: "SIGN_TRANSACTIONS",
          detail: {expected: indexesToSign.length, received: signed.length}
        },
        `Expected ${indexesToSign.length} signed transaction(s) from the wallet but received ${signed.length}`
      );
    }

    // The wallet returns signed transactions in group order; TransactionSigner
    // requires result[i] to correspond to txnGroup[indexesToSign[i]].
    const ascending = [...indexesToSign].sort((a, b) => a - b);

    return indexesToSign.map((index) => signed[ascending.indexOf(index)]);
  }

  async signData(
    data: PeraWalletArbitraryData[],
    signer: string,
    verifySignature?: boolean
  ): Promise<Uint8Array[]> {
    // eslint-disable-next-line no-magic-numbers
    const chainId = this.chainId || 4160;

    const transport = this.getTransport();

    const signatures: Uint8Array[] = await transport.signData(data, signer, chainId);

    // Verify signatures if validateSignature is true
    if (verifySignature) {
      const authAddr = await this.getAccountAuthAddr(signer, chainId);
      const effectiveSigner = authAddr || signer;

      for (let i = 0; i < signatures.length; i++) {
        const signature = signatures[i];
        const originalData = data[i].data;

        if (!this.verifySignature(originalData, signature, effectiveSigner)) {
          throw new PeraWalletConnectError(
            {
              type: "SIGN_DATA_VERIFICATION_FAILED"
            },
            `Signature verification failed for data item at index ${i}`
          );
        }
      }
    }

    return signatures;
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
    network?: PeraWalletNetwork
  ): Promise<PeraWalletArc60SignerResolution> {
    if (!algosdk.isValidAddress(accountAddress)) {
      throw new PeraWalletConnectError(
        {type: "SIGN_DATA_INVALID_ADDRESS"},
        `"${accountAddress}" is not a valid Algorand address.`
      );
    }

    // Plain-JS callers bypass the type, and the credential picker treats
    // anything but "mainnet" as testnet, so the value is checked here.
    if (network !== undefined && network !== "mainnet" && network !== "testnet") {
      throw new PeraWalletConnectError(
        {type: "SIGN_DATA_NETWORK_UNSUPPORTED", detail: network},
        `Unsupported network "${String(network)}": use "mainnet" or "testnet".`
      );
    }

    const isAllNetworksSession =
      this.chainId === undefined || this.chainId === ALGORAND_NODE_CHAIN_ID;
    const sessionNetwork = getNetworkFromChainId(this.chainId);

    if (!isAllNetworksSession && !sessionNetwork) {
      throw new PeraWalletConnectError(
        {type: "SIGN_DATA_NETWORK_UNSUPPORTED", detail: this.chainId},
        `This session is pinned to chainId ${this.chainId}, but connect can only read accounts on mainnet and testnet.`
      );
    }

    if (network && sessionNetwork && network !== sessionNetwork) {
      throw new PeraWalletConnectError(
        {type: "SIGN_DATA_NETWORK_MISMATCH", detail: {network, chainId: this.chainId}},
        `This session is pinned to ${sessionNetwork} (chainId ${this.chainId}); the wallet only serves it there, so the signer cannot be resolved on ${network}.`
      );
    }

    const resolvedNetwork = network ?? sessionNetwork;

    if (!resolvedNetwork) {
      throw new PeraWalletConnectError(
        {type: "SIGN_DATA_NETWORK_REQUIRED"},
        "resolveArc60Signer needs a network: this session accepts all networks, so pass the network the user's wallet is on."
      );
    }

    let authAddr: string | null;

    try {
      // Header only: the full record fails with "Result limit exceeded" for
      // accounts holding more resources than algod's per-account cap, and
      // auth-addr is part of the header.
      const accountInfo = await this.getAlgodClient(resolvedNetwork)
        .client.accountInformation(accountAddress)
        .exclude("all")
        .do();

      authAddr = accountInfo.authAddr ? String(accountInfo.authAddr) : null;
    } catch (error) {
      throw new PeraWalletConnectError(
        {type: "SIGN_DATA_AUTH_ADDR_LOOKUP_FAILED", detail: error},
        `Could not read the auth address of ${accountAddress} on ${resolvedNetwork}.`
      );
    }

    const signerAddress = authAddr ?? accountAddress;

    return {
      accountAddress,
      signerAddress,
      signer: algosdk.decodeAddress(signerAddress).publicKey,
      isRekeyed: authAddr !== null,
      network: resolvedNetwork
    };
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
  /**
   * SIWA origin binding: reject early on every transport when the requested
   * domain does not match the page origin. This is a client-side guard for
   * honest integrations — the extension enforces the rule independently.
   */
  private assertArc60DomainMatchesOrigin(domain: string) {
    if (isArc60OriginMismatch(domain, window.location.origin)) {
      throw new PeraWalletConnectError(
        {type: "SIGN_DATA_DOMAIN_MISMATCH"},
        `ARC-60 domain "${domain}" does not match the page origin "${window.location.origin}"`
      );
    }
  }

  async signArc60Data(
    payload: PeraWalletArc60SignData,
    metadata: SignMetadata,
    verifySignature?: boolean
  ): Promise<PeraWalletArc60SignDataResponse> {
    if (this.platform !== "mobile" && this.platform !== "extension") {
      throw new Error(
        "ARC-60 signing is only supported via the Pera mobile wallet or the Pera extension."
      );
    }

    this.assertArc60DomainMatchesOrigin(payload.domain);

    const transport = this.getTransport();
    const response = await transport.signArc60Data(payload, metadata);
    const effectiveSigner = algosdk.encodeAddress(payload.signer);

    if (verifySignature) {
      const ok = await this.verifyArc60Signature(
        decodeArc60SignedData(payload.data, metadata.encoding),
        payload.authenticatorData,
        response.signature,
        effectiveSigner
      );

      if (!ok) {
        throw new PeraWalletConnectError(
          {type: "SIGN_DATA_VERIFICATION_FAILED"},
          "ARC-60 signature verification failed"
        );
      }
    }

    return buildArc60SignDataResponse(payload, response.signature);
  }
}

export default PeraWalletConnect;
/* eslint-enable max-lines */
