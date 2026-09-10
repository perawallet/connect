/* eslint-disable max-lines */
import WalletConnect from "@perawallet/walletconnect";
import algosdk, {type TransactionSigner} from "algosdk";
import {sign_detached_verify} from "tweetnacl-ts";

import PeraWalletConnectError from "./util/PeraWalletConnectError";
import {
  openPeraWalletConnectModal,
  removeModalWrapperFromDOM,
  PERA_WALLET_CONNECT_MODAL_ID,
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
import {isArc60OriginMismatch} from "./transport/extension/originBinding";
import {MobileTransport} from "./transport/MobileTransport";
import {WebTransport} from "./transport/WebTransport";
import {ConnectOptions} from "./transport/WalletTransport";
import {buildArc60SignDataResponse, decodeArc60SignedData} from "./transport/arc60Wire";
import {Arc0027Client} from "./transport/extension/arc0027Client";

interface PeraWalletConnectOptions {
  bridge?: string;
  shouldShowSignTxnToast?: boolean;
  chainId?: AlgorandChainIDs;
  compactMode?: boolean;
  singleAccount?: boolean;
  shouldPreferExtension?: boolean;
  /**
   * Enables experimental features — currently ARC-0027 browser-extension
   * support (extension detection on `connect()`, the extension option in the
   * connect modal and the extension transport). Off by default and subject to
   * change.
   */
  experimental?: boolean;
}

function generatePeraWalletConnectModalActions({
  isWebWalletAvailable,
  shouldDisplayNewBadge,
  shouldUseSound,
  compactMode,
  promoteMobile,
  singleAccount,
  selectedAccount,
  isInWebview,
  isExtensionSupportEnabled,
  isExtensionAvailable,
  extensionName
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
      isExtensionSupportEnabled,
      isExtensionAvailable,
      extensionName
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
  private isExperimentalEnabled: boolean;
  private arc0027Client: Arc0027Client;
  private extensionTransport: ExtensionTransport;
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
    this.isExperimentalEnabled = options?.experimental || false;
    this.arc0027Client = new Arc0027Client();
    this.extensionTransport = new ExtensionTransport(this.arc0027Client);

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

  isExtensionAvailable(): Promise<boolean> {
    // Always false unless experimental features are enabled via
    // `new PeraWalletConnect({experimental: true})`.
    if (!this.isExperimentalEnabled) {
      return Promise.resolve(false);
    }

    return this.arc0027Client.discover().then((info) => info !== null);
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
    return new Promise<string[]>(async (resolve, reject) => {
      try {
        // check if already connected and kill session first before creating a new one.
        // This is to kill the last session and make sure user start from scratch whenever `.connect()` method is called.
        if (this.connector?.connected) {
          try {
            await this.connector.killSession();
          } catch (_error) {
            // No need to handle
          }
        }

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

        // Auto-detect the ARC-0027 browser extension before opening the modal
        // (requires the `experimental` option).
        const discovered =
          this.isExperimentalEnabled && this.shouldPreferExtension
            ? await this.arc0027Client.discover()
            : null;

        if (discovered) {
          // @ts-ignore ts-2339 — modal button bridge, mirrors onWebWalletConnect
          window.onExtensionConnect = () => {
            this.extensionTransport
              .connect({selectedAccount: options?.selectedAccount})
              .then((accounts) => {
                removeModalWrapperFromDOM(PERA_WALLET_CONNECT_MODAL_ID);
                resolve(accounts);
              })
              .catch(reject);
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
            isExtensionSupportEnabled: this.isExperimentalEnabled,
            isExtensionAvailable: !!discovered,
            extensionName: discovered?.name || "Pera Extension"
          })
        });

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

        this.connector.on("connect", (error, _payload) => {
          if (error) {
            reject(error);
          }

          resolve(this.connector?.accounts || []);

          saveWalletDetailsToStorage(this.connector?.accounts || []);
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
          if (!this.isExperimentalEnabled) {
            // The stored session predates disabling experimental features;
            // treat it as no session.
            await resetWalletDetailsFromStorage();
            resolve([]);

            return;
          }

          const accounts = await this.extensionTransport.reconnect();

          // reconnect() returns [] but leaves storage intact when the
          // extension is still present; fall back to stored accounts.
          resolve(accounts.length ? accounts : walletDetails.accounts || []);

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
    let killPromise: Promise<void> | undefined;

    if (this.isConnected && this.platform === "extension") {
      await this.extensionTransport.disconnect();
    }

    if (this.isConnected && this.platform === "mobile") {
      killPromise = this.connector?.killSession();

      killPromise?.then(() => {
        this.connector = null;
      });
    }

    await resetWalletDetailsFromStorage();
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
