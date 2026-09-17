![Pera Connect Cover Image](https://user-images.githubusercontent.com/54077855/179966121-bd9295c3-5f61-4203-b13f-851434e72d35.png)

## @perawallet/connect

JavaScript SDK for integrating [Pera Wallet](https://perawallet.app) to web applications. For more detailed information, please check our [Pera Connect Docs](https://docs.perawallet.app/references/pera-connect/). You may also want to check the [use-wallet](https://github.com/TxnLab/use-wallet). Use-wallet provides an easy way to integrate multiple wallets into your dApp. 

[![](https://img.shields.io/npm/v/@perawallet/connect?style=flat-square)](https://www.npmjs.com/package/@perawallet/connect) [![](https://img.shields.io/bundlephobia/min/@perawallet/connect?style=flat-square)](https://www.npmjs.com/package/@perawallet/connect)

## Getting Started

[Learn how to integrate with your JavaScript application](#guide)

[Learn how to Sign Transactions](#sign-transaction)

[Try it out using CodeSandbox](#example-applications)

## Example Applications

<details>
  <summary>Expand details</summary>
  
- [Using React Hooks](https://codesandbox.io/s/perawallet-connect-react-demo-zlvokc)

- [Using React Hooks with React@18](https://codesandbox.io/s/perawallet-connect-react-18-demo-tig2md)

- [Using Vue3](https://codesandbox.io/s/perawallet-connect-vue3-demo-yiyw4b)

- [Using Svelte](https://codesandbox.io/s/perawallet-connect-svelte-demo-ys1m4x)

- [Using Next.js](https://codesandbox.io/s/perawallet-connect-next-js-demo-ryhbdb)

- [Using Nuxt.js](https://codesandbox.io/s/perawallet-connect-nuxt-js-demo-s65z58)

- [Vanilla JS](https://codesandbox.io/s/perawallet-connect-vanillajs-demo-s5pjeo)
</details>

## Quick Start

Let's start with installing `@perawallet/connect`

```sh
# pnpm
pnpm add @perawallet/connect

# npm
npm install @perawallet/connect

# yarn
yarn add @perawallet/connect
```

Subscribe to `disconnect` once, next to the instance rather than inside a connect
callback: `on()` keeps every handler you pass it until you unsubscribe, so
registering a fresh one per connect leaves the old ones running too.

```jsx
// Once, alongside the peraWallet instance — not inside connect()/reconnectSession()
useEffect(() => {
  // Fires for every transport (mobile, extension) when the wallet ends the
  // session on its side. Returns the unsubscribe function.
  const unsubscribe = peraWallet.on("disconnect", handleDisconnectWalletClick);

  // Releases the `window.pera` subscriptions this instance holds; the wallet
  // session itself is untouched.
  return () => {
    unsubscribe();
    peraWallet.dispose();
  };
}, []);
```

```jsx
// Connect handler
peraWallet
  .connect()
  .then((newAccounts) => {
    setAccountAddress(newAccounts[0]);
  })
  .catch((error) => {
    // You MUST handle the reject because once the user closes the modal, peraWallet.connect() promise will be rejected.
    // For the async/await syntax you MUST use try/catch
    if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
      // log the necessary errors
    }
  });
```

If you don't want the user's account information to be lost by the dApp when the user closes the browser with user’s wallet connected to the dApp, you need to handle the reconnect session status. You can do this in the following way.

```jsx
// On the every page refresh
peraWallet.reconnectSession().then((accounts) => {
  if (accounts.length) {
    setAccountAddress(accounts[0]);
  }
});
```

After that you can sign transaction with this way

```jsx
// Single Transaction
try {
  const signedTxn = await peraWallet.signTransaction([singleTxnGroups]);
} catch (error) {
  console.log("Couldn't sign Opt-in txns", error);
}
```

## Options

| option                   | default | value                                 |          |
| ------------------------ | ------- | ------------------------------------- | -------- |
| `chainId`                | `4160`  | `416001`, `416002`, `416003` , `4160` | optional |
| `shouldShowSignTxnToast` | `true`  | `boolean`                             | optional |
| `compactMode`            | `false` | `boolean`                             | optional |
| `shouldPreferExtension`  | `true`  | `boolean`                             | optional |

#### **`chainId`**

Determines which Algorand network your dApp uses.

**MainNet**: 416001

**TestNet**: 416002

**BetaNet**: 416003

**All Networks**: 4160

#### **`shouldShowSignTxnToast`**

<img width="422" alt="Group 48096937" src="https://user-images.githubusercontent.com/54077855/202682828-9ac57b62-58c1-4a83-af3b-e1b7ffad2d89.png">

It's enabled by default but in some cases, you may not need the toast message (e.g. you already have signing guidance for users). To disable it, use the `shouldShowSignTxnToast` option.

#### **`compactMode`**

It offers a compact UI optimized for smaller screens, with a minimum resolution of 400x400 pixels.

#### **`shouldPreferExtension`**

When the Pera browser extension is installed, the connect modal lists "Connect with Pera Extension" first and pre-selects it. Set this to `false` to leave the extension out of the modal and only offer the QR code and Pera Web options. See [Browser extension](#browser-extension-windowpera) below.

## Methods

#### `PeraWalletConnect.connect(): Promise<string[]>`

Starts the initial connection flow and returns the array of account addresses.

#### `PeraWalletConnect.reconnectSession(): Promise<string[]>`

Reconnects to the wallet if there is any active connection and returns the array of account addresses.

#### `PeraWalletConnect.disconnect(): Promise<void | undefined>`

Disconnects from the wallet and resets the related storage items. Pera's session state lives only under its own `localStorage` keys (`PeraWallet.Wallet` and `PeraWallet.WalletConnect`), so disconnecting never removes another wallet's WalletConnect session. A session stored under the shared `walletconnect` key by earlier versions is migrated to `PeraWallet.WalletConnect` automatically the first time `PeraWalletConnect` is instantiated.


#### `PeraWalletConnect.platform: PeraWalletPlatformType`

Returns the platform of the active session. Possible responses: _`mobile | web | extension | null`_

#### `PeraWalletConnect.isExtensionAvailable(): Promise<boolean>`

Resolves with whether the Pera browser extension's provider (`window.pera`) is present on the page. See [Browser extension](#browser-extension-windowpera).

#### `PeraWalletConnect.on(event, handler): () => void`

Subscribes to session events and returns the unsubscribe function.

- `"disconnect"`: the wallet ended the session on its side. With the extension this happens when the user revokes your site from the extension's Connections screen; with Pera mobile when the WalletConnect session is killed from the app. The SDK has already cleared its session state when the handler runs. It does not fire for teardown the SDK itself starts — your own `disconnect()` call, or the session `connect()` replaces.
- `"networkChanged"`: the extension wallet switched network, on a session owned by the extension. The handler receives `{network: "mainnet" | "testnet" | "betanet"}`.

Handlers stay subscribed until you call the returned function, so register them once per instance rather than on every connect.

```typescript
const unsubscribe = peraWallet.on("disconnect", () => setAccountAddress(null));
```

#### `PeraWalletConnect.dispose(): void`

Releases everything the instance holds — the `window.pera` subscriptions and any WalletConnect connector — without touching the wallet session. Call it when the component owning the instance unmounts; under React StrictMode or hot reload, an undisposed instance keeps listening and swallows events the live one should handle. Use `disconnect()` to end the session itself.

#### `PeraWalletConnect.isConnected: boolean`

Checks if there's any active session regardless of platform. Possible responses: _`true | false`_

#### `PeraWalletConnect.isPeraDiscoverBrowser: boolean`

Checks if it is on Pera Discover Browser. Possible responses: _`true | false`_

#### `PeraWalletConnect.signTransaction(txGroups: SignerTransaction[][], signerAddress?: string): Promise<Uint8Array[]>`

Starts the sign process and returns the signed transaction in `Uint8Array`

#### `PeraWalletConnect.transactionSigner: TransactionSigner`

An algosdk [`TransactionSigner`](https://github.com/algorand/js-algorand-sdk/blob/develop/src/signer.ts) backed by the current wallet connection, so Pera can be plugged straight into `AtomicTransactionComposer` (or anything else that accepts a signer). The whole group is sent to the wallet in a single request; transactions not assigned to Pera are shown to the user but not signed. The same function instance is returned on every access, which is what lets the composer batch every Pera-signed transaction into one prompt. The signer carries only the transactions themselves; if you need `authAddr`, `msig` or a per-transaction `message`, call `signTransaction` directly.

<details>
  <summary>See example</summary>

```typescript
import algosdk from "algosdk";

const peraWallet = new PeraWalletConnect();
const [sender] = await peraWallet.reconnectSession();

const algod = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");
const suggestedParams = await algod.getTransactionParams().do();
const atc = new algosdk.AtomicTransactionComposer();

atc.addTransaction({
  signer: peraWallet.transactionSigner,
  txn: algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender,
    receiver: sender,
    amount: 0,
    suggestedParams
  })
});

const result = await atc.execute(algod, 4);
```
</details>

#### `PeraWalletConnect.signData(data: PeraWalletArbitraryData[], signer: string, verifySignature?: boolean): Promise<Uint8Array[]>`

Starts the signing process for arbitrary data signing and returns the signed data in `Uint8Array`. Uses `signBytes` method of `algosdk` behind the scenes. `signer` should be a valid Algorand address that exists in the user's wallet.

**Parameters:**
- `data`: Array of arbitrary data to sign
- `signer`: Algorand address that will sign the data
- `verifySignature` (optional): If `true`, automatically detects if the account is rekeyed (has `authAddr`) and uses the `authAddr` as the signer. After signing, verifies each signature against the original data. Defaults to `false`.

**Note:** When `verifySignature` is `true`, the function will:
1. Fetch account information from the Algorand network
2. Check if the account has an `authAddr` (rekeyed account)
3. Automatically use the `authAddr` as the signer if it exists, otherwise use the provided `signer` address
4. Verify each signature after signing using the `verifySignature` method (see below)

<details>
  <summary>See example</summary>
  
```typescript
// Basic usage
const signedData: Uint8Array[] = await peraWallet.signData([
  {
    data: new Uint8Array(Buffer.from(`timestamp//${Date.now()}`)),
    message: "Timestamp confirmation"
  },
  {
    data: new Uint8Array(Buffer.from(`agent//${navigator.userAgent}`)),
    message: "User agent confirmation"
  }
], "SAHBJDRHHRR72JHTWSXZR5VHQQUVC7S757TJZI656FWSDO3TZZWV3IGJV4");

// With signature verification (automatically handles rekeyed accounts)
const verifiedSignedData: Uint8Array[] = await peraWallet.signData([
  {
    data: new Uint8Array(Buffer.from(`timestamp//${Date.now()}`)),
    message: "Timestamp confirmation"
  }
], "SAHBJDRHHRR72JHTWSXZR5VHQQUVC7S757TJZI656FWSDO3TZZWV3IGJV4", true);
```
</details>

#### `PeraWalletConnect.verifySignature(data: Uint8Array, signature: Uint8Array, signerAddress: string): boolean`

Verifies a signature against the provided data and signer address. This method can be used independently to verify signatures returned from `signData` or other sources. When `signData` is called with `verifySignature: true`, it uses this method internally to verify the signatures.

**Parameters:**
- `data`: The original data that was signed (as `Uint8Array`)
- `signature`: The signature to verify (as `Uint8Array`)
- `signerAddress`: The Algorand address that should have signed the data

**Returns:** `true` if the signature is valid, `false` otherwise.

**Note:** This method automatically prefixes the data with "MX" (bytes `[77, 88]`) before verification to be consistent with `algosdk.verifyBytes` function. This ensures compatibility with Algorand's standard signature verification format. The data passed to this method should be the original data without the "MX" prefix, as the prefix is added internally.

<details>
  <summary>See example</summary>
  
```typescript
// Verify a signature independently
const isValid = peraWallet.verifySignature(
  originalData,
  signature,
  "SAHBJDRHHRR72JHTWSXZR5VHQQUVC7S757TJZI656FWSDO3TZZWV3IGJV4"
);

if (isValid) {
  console.log("Signature is valid!");
} else {
  console.log("Signature verification failed!");
}
```
</details>

#### `PeraWalletConnect.signArc60Data(payload: PeraWalletArc60SignData, metadata: SignMetadata, verifySignature?: boolean): Promise<PeraWalletArc60SignDataResponse>`

Signs an ARC-60 payload (for example a Sign-In With Algorand request) with the Pera mobile wallet or the Pera extension. `payload.signer` is the public key that must sign, `payload.domain` must match your page origin, and `metadata` is `{scope: ScopeType.AUTH, encoding: "base64"}`. With `verifySignature: true` the returned signature is checked against `payload.signer` before resolving. For rekeyed accounts see `resolveArc60Signer` below.

#### `PeraWalletConnect.resolveArc60Signer(accountAddress: string, network?: PeraWalletNetwork): Promise<PeraWalletArc60SignerResolution>`

Resolves who has to sign an ARC-60 request for `accountAddress`. An ARC-60 signature is verified against the `signer` public key, and Pera never substitutes another key. If the account is rekeyed, its own key no longer controls it, so the request must name the on-chain **auth address** as `signer` while the SIWA payload keeps the account as `account_address`. Pera refuses a rekeyed account that names itself as `signer`, and it can only sign when the user's wallet holds the auth address as a key-bearing or Ledger account (a watch-only or multisig auth address cannot sign ARC-60).

Rekeys are per network, and the wallet checks them on the network it is currently connected to, which connect cannot observe:

- With `chainId: 416001` or `416002` the wallet only serves the session while it is on that network, so `network` can be omitted; passing a different one throws `SIGN_DATA_NETWORK_MISMATCH`. This is the recommended setup.
- With an all-networks session (`4160`, the default) `network` is required (`SIGN_DATA_NETWORK_REQUIRED` otherwise) and must be the network the user's wallet is on; if it is not, the wallet rejects the sign-in.
- Betanet sessions (`416003`) and values other than `"mainnet"` / `"testnet"` throw `SIGN_DATA_NETWORK_UNSUPPORTED`.

**Returns:** `{accountAddress, signerAddress, signer, isRekeyed, network}`. `signer` is `signerAddress` as a public key, ready for `PeraWalletArc60SignData.signer`.

**Throws:** `SIGN_DATA_INVALID_ADDRESS` for a malformed address, the network errors above, and `SIGN_DATA_AUTH_ADDR_LOOKUP_FAILED` when the account lookup fails (the cause is in `error.data.detail`), instead of assuming the account is not rekeyed.

<details>
  <summary>See example</summary>

```typescript
import {PeraWalletConnect, ScopeType} from "@perawallet/connect";

// Pin the session to one network so the wallet and this lookup agree.
const peraWallet = new PeraWalletConnect({chainId: 416002});
const [accountAddress] = await peraWallet.connect();

const {signer, signerAddress} = await peraWallet.resolveArc60Signer(accountAddress);

const siwa = {
  account_address: accountAddress, // the account being authenticated
  chain_id: "283",
  domain: window.location.host,
  nonce: crypto.randomUUID(),
  type: "ed25519",
  uri: window.location.origin,
  version: "1"
};

const response = await peraWallet.signArc60Data(
  {
    data: Buffer.from(JSON.stringify(siwa, Object.keys(siwa).sort())).toString("base64"),
    signer, // the auth address when rekeyed, the account itself otherwise
    domain: siwa.domain,
    authenticatorData: new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(siwa.domain))
    )
  },
  {scope: ScopeType.AUTH, encoding: "base64"},
  true
);

// Send `response` and `signerAddress` to your backend. A verifier checks the
// signature against `signerAddress`, then checks on chain that `signerAddress`
// is the current auth address of `account_address`, or, when the two are equal,
// that `account_address` has no auth address (it is not rekeyed).
```
</details>

## Customizing Style

You can override the z-index using the `.pera-wallet-modal` class so that the modal does not conflict with another component on your application.

```scss
.pera-wallet-modal {
  // The default value of z-index is 10. You can lower and raise it as much as you want.
  z-index: 11;
}
```

## Your app name on Pera Wallet

By default, the connect wallet drawer on Pera Wallet gets the app name from `document.title`.

In some cases, you may want to customize it. You can achieve this by adding a meta tag to your HTML between the `head` tag.

```html
<meta name="name" content="My dApp" />
```

## Browser extension (`window.pera`)

The Pera browser extension injects a provider at `window.pera` on every `https` page (and `http://localhost`) before any page script runs. When it is present, `@perawallet/connect` uses it directly instead of WalletConnect: the connect modal lists "Connect with Pera Extension" first and pre-selects it, and `connect()`, `reconnectSession()`, `signTransaction()`, `signData()`, `signArc60Data()` and `disconnect()` all go through the provider. Pages without the extension behave exactly as before, and users can still pick the QR code or Pera Web options from the same modal.

The SDK detects the provider synchronously when it is constructed, so no probe or handshake delays the connect modal. Call `peraWallet.isExtensionAvailable()` if you want to know yourself, or `getPeraProvider()` to reach the provider directly. Pass `shouldPreferExtension: false` to keep the extension out of the modal.

#### `connect()` needs a user gesture

The extension only opens its approval window for a first-time connection while the page has transient user activation (a click or key press within the last few seconds). The SDK's extension button calls `window.pera.connect()` synchronously from its click handler, so the normal flow works out of the box. If you build your own UI on top of `window.pera`, call `connect()` directly inside your click handler, before any `await`; a connect without activation fails with code `-32001` and no approval window.

Once your origin is approved, `reconnectSession()` resolves silently with the wallet's current accounts on every page load. If the user has revoked the site, it resolves with `[]` just like any other missing session. Any other failure — a wallet on a network your `chainId` does not allow, or the extension's service worker restarting mid page-load — rejects with the cause at `error.data.type` and leaves the approval in place, so a later reload picks the session back up.

#### Networks

With a specific `chainId` (`416001`, `416002`, `416003`) the SDK asks the extension for that network, and `connect()` rejects with `CONNECT_NETWORK_MISMATCH` when the wallet is on a different one. With the default `4160` the wallet connects on whatever network it is on. Subscribe to `peraWallet.on("networkChanged", ...)` to follow later switches.

#### Errors

Provider errors are mapped onto the SDK's `PeraWalletConnectError` types:

| extension code | meaning                          | `error.data.type`                                                                         |
| -------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| `-32002`       | user rejected                    | `CONNECT_CANCELLED`, `SIGN_TXN_CANCELLED`, `SIGN_DATA_CANCELLED`                          |
| `-32003`       | network mismatch                 | `CONNECT_NETWORK_MISMATCH`, `SIGN_TXN_NETWORK_MISMATCH`, `SIGN_DATA_NETWORK_MISMATCH`     |
| `-32001`       | not connected / no user gesture  | `SESSION_CONNECT` on connect, `SESSION_DISCONNECTED` when signing, `[]` from reconnect    |
| `-32004`       | the wallet did not answer in time| `MESSAGE_NOT_RECEIVED`                                                                    |

The wallet applies its own approval timeout (about five minutes); the SDK adds none, so users can take their time. The original provider error is attached as `error.data.detail`.

#### Using `window.pera` directly

The provider's types are exported for dApps that talk to it themselves:

```typescript
import {getPeraProvider, PERA_PROVIDER_ERROR_CODES, type PeraProvider} from "@perawallet/connect";

const pera = getPeraProvider(); // PeraProvider | null, also typed as window.pera
```

## Contributing

All contributions are welcomed! To get more information about the details, please read the [contribution](./CONTRIBUTING.md) guide first.
