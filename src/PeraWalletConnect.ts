/* eslint-disable max-lines */
import WalletConnect from "@perawallet/walletconnect";
import algosdk from "algosdk";
import {sign_detached_verify} from "tweetnacl-ts";

import PeraWalletConnectError from "./util/PeraWalletConnectError";
import {
  openPeraWalletConnectModal,
  openPeraWalletRedirectModal,
  removeModalWrapperFromDOM,
  PERA_WALLET_CONNECT_MODAL_ID,
  PERA_WALLET_REDIRECT_MODAL_ID,
  openPeraWalletSignTxnToast,
  PERA_WALLET_SIGN_TXN_TOAST_ID,
  PeraWalletModalConfig,
  setupPeraWalletConnectModalCloseListener
} from "./modal/peraWalletConnectModalUtils";
import {
  getWalletDetailsFromStorage,
  resetWalletDetailsFromStorage,
  saveWalletDetailsToStorage,
  getWalletConnectObjectFromStorage,
  getWalletPlatformFromStorage
} from "./util/storage/storageUtils";
import {getPeraConnectConfig} from "./util/api/peraWalletConnectApi";
import {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  PeraWalletTransaction,
  SignerTransaction,
  SignMetadata
} from "./util/model/peraWalletModels";
import {
  base64ToUint8Array,
  composeTransaction,
  formatJsonRpcRequest
} from "./util/transaction/transactionUtils";
import {isMobile} from "./util/device/deviceUtils";
import {AlgorandChainIDs} from "./util/peraWalletTypes";
import {runWebConnectFlow} from "./util/connect/connectFlow";
import {concatArrays} from "./util/array/arrayUtils";
import {AlgodManager} from "./util/algod/algod";
import {DEFAULT_ALGORAND_NODE_PROVIDER_TYPE} from "./util/algod/algodConstants";
import {NetworkToggle} from "./util/algod/algodTypes";
import {getNetworkFromChainId} from "./util/algod/algodUtils";
import {PERA_WALLET_SIGNATURE_PREFIX} from "./util/peraWalletConstants";
import {getPublicSettings} from "./util/webview-api/webviewApi";
import {ExtensionTransport} from "./transport/extension/ExtensionTransport";
import {isArc60OriginMismatch} from "./transport/extension/originBinding";
import {MobileTransport} from "./transport/MobileTransport";
import {WebTransport} from "./transport/WebTransport";
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
  connect(options?: {selectedAccount?: string}) {
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

        // Create Connector instance
        this.connector = new WalletConnect({
          bridge: this.bridge || bridgeURL || "https://bridge.walletconnect.org",
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
        console.log(error);

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
            bridge: this.bridge
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
      const dataHash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
      const authHash = new Uint8Array(
        await crypto.subtle.digest("SHA-256", authenticatorData)
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
      const network = getNetworkFromChainId(chainId);
      const algodClient = this.getAlgodClient(network);
      const accountInfo = await algodClient.client.accountInformation(signer).do();

      return accountInfo.authAddr ? String(accountInfo.authAddr) : null;
    } catch (error) {
      // If account fetch fails, return null to fall back to using the original signer
      // This ensures signing can proceed even if there's a network issue
      return null;
    }
  }

  async signTransaction(
    txGroups: SignerTransaction[][],
    signerAddress?: string
  ): Promise<Uint8Array[]> {
    if (this.platform === "mobile") {
      if (isMobile() && !this.isInWebview) {
        // This is to automatically open the wallet app when trying to sign with it.
        openPeraWalletRedirectModal();
      } else if (!isMobile() && this.shouldShowSignTxnToast) {
        // This is to inform user go the wallet app when trying to sign with it.
        openPeraWalletSignTxnToast();
      }

      if (!this.connector) {
        throw new Error("PeraWalletConnect was not initialized correctly.");
      }
    }

    // Prepare transactions to be sent to wallet
    const signTxnRequestParams = txGroups.flatMap((txGroup) =>
      txGroup.map<PeraWalletTransaction>((txGroupDetail) =>
        composeTransaction(txGroupDetail, signerAddress)
      )
    );

    if (this.platform === "web") {
      const {webWalletURL} = await getPeraConnectConfig();

      return new WebTransport({
        getWebWalletURL: () => Promise.resolve(webWalletURL)
      }).signTransaction(signTxnRequestParams);
    }

    if (this.platform === "extension") {
      return this.extensionTransport.signTransaction(signTxnRequestParams);
    }

    return new MobileTransport({
      connector: this.connector as any,
      shouldShowSignTxnToast: this.shouldShowSignTxnToast,
      isInWebview: this.isInWebview,
      getSilent: async () => (await getPeraConnectConfig()).silent
    }).signTransaction(signTxnRequestParams);
  }

  async signData(
    data: PeraWalletArbitraryData[],
    signer: string,
    verifySignature?: boolean
  ): Promise<Uint8Array[]> {
    // eslint-disable-next-line no-magic-numbers
    const chainId = this.chainId || 4160;

    if (this.platform === "mobile") {
      if (isMobile() && !this.isInWebview) {
        // This is to automatically open the wallet app when trying to sign with it.
        openPeraWalletRedirectModal();
      } else if (!isMobile() && this.shouldShowSignTxnToast) {
        // This is to inform user go the wallet app when trying to sign with it.
        openPeraWalletSignTxnToast();
      }

      if (!this.connector) {
        throw new Error("PeraWalletConnect was not initialized correctly.");
      }
    }

    let signatures: Uint8Array[];

    if (this.platform === "extension") {
      signatures = await this.extensionTransport.signData(data, signer, chainId);
    } else if (this.platform === "web") {
      const {webWalletURL} = await getPeraConnectConfig();

      signatures = await new WebTransport({
        getWebWalletURL: () => Promise.resolve(webWalletURL)
      }).signData(data, signer, chainId);
    } else {
      // Pera Mobile Wallet flow
      signatures = await new MobileTransport({
        connector: this.connector as any,
        shouldShowSignTxnToast: this.shouldShowSignTxnToast,
        isInWebview: this.isInWebview,
        getSilent: async () => (await getPeraConnectConfig()).silent
      }).signData(data, signer, chainId);
    }

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

    if (this.platform === "extension") {
      const response = await this.extensionTransport.signArc60Data(payload, metadata);

      if (verifySignature) {
        const ok = await this.verifyArc60Signature(
          Buffer.from(payload.data, "base64"),
          payload.authenticatorData,
          response.signature,
          algosdk.encodeAddress(payload.signer)
        );

        if (!ok) {
          throw new PeraWalletConnectError(
            {type: "SIGN_DATA_VERIFICATION_FAILED"},
            "ARC-60 signature verification failed"
          );
        }
      }

      return response;
    }

    if (isMobile() && !this.isInWebview) {
      // This is to automatically open the wallet app when trying to sign with it.
      openPeraWalletRedirectModal();
    }

    if (!this.connector) {
      throw new Error("PeraWalletConnect was not initialized correctly.");
    }

    const dataBase64 = Buffer.isEncoding(metadata.encoding)
      ? Buffer.from(payload.data, metadata.encoding).toString("base64")
      : payload.data;

    const wireParams: Record<string, unknown> = {
      data: dataBase64,
      signer: algosdk.encodeAddress(payload.signer),
      domain: payload.domain,
      authenticatorData: Buffer.from(payload.authenticatorData).toString("base64"),
      metadata
    };

    if (payload.requestId !== undefined) wireParams.requestId = payload.requestId;
    if (payload.hdPath !== undefined) wireParams.hdPath = payload.hdPath;

    const request = formatJsonRpcRequest("algo_signData", wireParams);

    try {
      const {silent} = await getPeraConnectConfig();

      // ARC-60 requires `params` to be a single object (not an array) — that
      // is how the mobile wallet differentiates ARC-60 from legacy
      // arbitrary-data requests. WalletConnect v1's request type insists on
      // `params: any[]`, so we cast to bypass that constraint.
      const response = await this.connector.sendCustomRequest(request as any, {
        forcePushNotification: !silent
      });

      // Mobile returns the signature wrapped in an array.
      const responseArray = Array.isArray(response) ? response : [response];
      const first = responseArray.filter(Boolean)[0];

      if (!first) {
        throw new Error("No signature returned from wallet.");
      }

      const signature =
        typeof first === "string"
          ? base64ToUint8Array(first)
          : Uint8Array.from(first as number[]);
      const effectiveSigner = algosdk.encodeAddress(payload.signer);

      if (verifySignature) {
        // ARC-60 signatures are always produced by the requested account's
        // own key — the wallet does not follow rekeys for off-chain data —
        // so verify against the signer address's pubkey, not its auth addr.
        const ok = await this.verifyArc60Signature(
          Buffer.from(payload.data, "base64"),
          payload.authenticatorData,
          signature,
          effectiveSigner
        );

        if (!ok) {
          throw new PeraWalletConnectError(
            {type: "SIGN_DATA_VERIFICATION_FAILED"},
            "ARC-60 signature verification failed"
          );
        }
      }

      return {
        data: dataBase64,
        signer: algosdk.decodeAddress(effectiveSigner).publicKey,
        domain: payload.domain,
        authenticatorData: payload.authenticatorData,
        ...(payload.requestId !== undefined && {requestId: payload.requestId}),
        ...(payload.hdPath !== undefined && {hdPath: payload.hdPath}),
        signature
      };
    } catch (error) {
      return Promise.reject(
        new PeraWalletConnectError(
          {
            type: "SIGN_TRANSACTIONS",
            detail: error
          },
          (error as Error)?.message || "Failed to sign ARC-60 data"
        )
      );
    } finally {
      removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
      removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);
    }
  }
}

export default PeraWalletConnect;
/* eslint-enable max-lines */
