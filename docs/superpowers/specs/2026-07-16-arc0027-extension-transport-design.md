# ARC-0027 Browser-Extension Transport for Pera Connect

**Date:** 2026-07-16
**Status:** Design — approved for planning
**Author:** Will Beaumont

## 1. Summary & goals

Enable `@perawallet/connect` to auto-detect and drive a co-located ARC-0027
browser extension (the Pera Wallet extension being ported from the React Native
app) directly from the dApp page, while preserving today's WalletConnect-QR and
Pera-Web flows as always-available fallbacks.

Non-goals for this iteration:

- Liquid Auth transport (the abstraction is designed to accommodate it later).
- `post_transactions` / `sign_and_post_transactions` (the extension returns
  `4003 MethodNotSupportedError` today).
- Multi-network discovery (the extension advertises only its active network).
- Legacy arbitrary-data signing on the extension path (see §5 — the extension
  rejects it in v1).

## 2. Background: the integration seam

The extension does **not** inject a `window.algorand` object. Its MAIN-world
content script listens on `window.postMessage` for ARC-0027 request envelopes
and replies via `window.postMessage`, correlated by `requestId`. Detection is
therefore an active `discover` round-trip, not a synchronous property check.

Envelope shapes (from
`pera-browser-extension/extensions/platform-chrome/src/dapp/arc0027-types.ts`):

```
request:  { id, reference: "arc0027:<method>:request",  params? }
response: { id, requestId, reference: "arc0027:<method>:response", result? | error? }
```

`response.id` is a fresh UUID; correlation is via `response.requestId ===
request.id`. Error codes: `4000` UnknownError, `4001` MethodCanceledError,
`4002` MethodTimedOutError (120s), `4003` MethodNotSupportedError, `4004`
NetworkNotSupportedError, `4100` UnauthorizedSignerError, `4200`
InvalidInputError.

### Extension operation support (verified against the extension repo)

| ARC-0027 method | Extension status |
|---|---|
| `discover` | ✅ no approval; returns `{providerId, name, icon, networks[]}` |
| `enable` | ✅ approval popup; returns `{providerId, genesisHash, genesisId, accounts[]}` |
| `disable` | ✅ revokes per-origin permission |
| `sign_transactions` | ✅ approval popup; returns `{providerId, stxns[]}` |
| `sign_message` | ✅ **ARC-60 only** (see §5); returns `{providerId, signature}` |
| `post_transactions` | ❌ `4003` |
| `sign_and_post_transactions` | ❌ `4003` |

## 3. Method mapping

| Connect method | ARC-0027 method | Extension support |
|---|---|---|
| `connect()` | `enable` | ✅ |
| `reconnectSession()` | `discover` + stored permission | ✅ |
| `disconnect()` | `disable` | ✅ |
| `signTransaction()` | `sign_transactions` | ✅ |
| `signArc60Data()` | `sign_message` | ✅ (no longer mobile-only) |
| `signData()` (legacy arbitrary data) | `sign_message` | ❌ rejected in extension v1 → fail fast |

## 4. Architecture: transport abstraction (extract all three)

Today `PeraWalletConnect.ts` branches on a `platform` of `"mobile" | "web"`
derived from storage, with WalletConnect and Teller/postMessage logic inline.
We introduce a transport interface and move all three implementations behind it.

`src/transport/WalletTransport.ts`:

```ts
interface WalletTransport {
  readonly platform: "mobile" | "web" | "extension";
  connect(opts?: ConnectOptions): Promise<string[]>;
  reconnect(): Promise<string[]>;
  disconnect(): Promise<void>;
  signTransaction(
    txns: PeraWalletTransaction[],
    signerAddress?: string
  ): Promise<Uint8Array[]>;
  signData(
    data: PeraWalletArbitraryData[],
    signer: string,
    chainId: AlgorandChainIDs
  ): Promise<Uint8Array[]>;
  signArc60Data(
    payload: PeraWalletArc60SignData,
    verifySignature?: boolean
  ): Promise<PeraWalletArc60SignDataResponse>;
}
```

Implementations under `src/transport/`:

- **`MobileTransport`** — the WalletConnect + `algo_signTxn` / `algo_signData`
  logic moved out of `PeraWalletConnect.ts` (current lines 364–470, 651–751).
  Owns the WalletConnect connector, redirect modal / sign-txn toast side effects,
  and the ARC-60 mobile flow.
- **`WebTransport`** — the Teller / `runWebConnectFlow` / `runWebSignTransactionFlow`
  logic moved out. `signArc60Data` throws (unchanged from today).
- **`ExtensionTransport`** — new (§5).

`PeraWalletConnect` becomes a thin orchestrator that:

- Holds the active `WalletTransport` and delegates each public method.
- Keeps cross-cutting concerns: config prefetch (`_configPromise`),
  `verifySignature` / `verifyArc60Signature`, algod client management for
  auth-addr resolution, and storage.
- Runs transport selection on `connect()` (§7) and `reconnectSession()`.
- Preserves the existing public method signatures exactly — no breaking change.

`get platform` continues to derive from storage, extended to map the new
`"pera-wallet-extension"` type → `"extension"`.

**Testing note:** because proven mobile/web code is being moved, this extraction
requires regression tests pinning current mobile and web signing behavior
before and after the move (see §10).

## 5. ExtensionTransport & the ARC-0027 client

New module `src/transport/extension/arc0027Client.ts` — a framework-free client:

- **Channel primitive.** Builds `{id, reference, params}`, posts via
  `window.postMessage(envelope, targetOrigin)`, and resolves the first `window`
  `message` whose `requestId === id`. Registers a single `message` listener per
  request, ignores unrelated/foreign messages, and removes the listener on
  settle. Each request has a timeout; the default `discover` timeout is short
  (~300ms) and sign/enable timeouts use the extension's 120s ceiling (the
  extension shows its own approval popup during that window).
- **`discover(timeoutMs = 300): Promise<DiscoverInfo | null>`** — posts
  `arc0027:discover:request`; resolves provider info or `null` on timeout. This
  is the auto-detect primitive.
- **`enable` / `disable` / `signTransactions` / `signMessage`** — typed wrappers.
- **Error mapping** — ARC-0027 codes → `PeraWalletConnectError`:
  `4001 → CONNECT_MODAL_CLOSED` (during connect) / `SIGN_TXN_CANCELLED` (during
  sign); `4100 → SESSION_RECONNECT`; `4002 → SIGN_TRANSACTIONS` (timeout);
  `4200/4004/4003 → SIGN_TRANSACTIONS` with the extension's message preserved.

`ExtensionTransport implements WalletTransport`:

- `connect()` → `enable` → persist `type: "pera-wallet-extension"` + accounts to
  storage; resolve accounts. No WalletConnect session object is stored.
- `disconnect()` → `disable` → clear storage.
- `signTransaction()` → `sign_transactions`; decode `stxns[]` (base64) → `Uint8Array[]`.
- `signArc60Data()` → `sign_message`. Sends the **identical `wireParams` object**
  Connect already builds for the mobile ARC-60 flow (`PeraWalletConnect.ts:672`),
  which matches the extension's `arc60WireSchema`
  (`packages/signing/src/utils/arc60-wire.ts:58`) field-for-field: `data`,
  `signer`, `domain`, `authenticatorData` (all base64/string), optional
  `requestId` / `hdPath`, and `metadata: {scope, encoding}`. Wraps the returned
  base64 `signature` back into `PeraWalletArc60SignDataResponse`. No new schema.
- `signData()` (legacy arbitrary data) → **fail fast**: throws
  `PeraWalletConnectError({type: "SIGN_TRANSACTIONS"}, "Arbitrary-data signing is
  not supported by the Pera extension; use signArc60Data, or connect via Pera
  mobile / Pera Web")`. The extension rejects non-ARC-60 `sign_message` payloads
  in v1 (`isArc60WirePayload` gate in
  `apps/mobile/.../useSignRequestApprovalScreen.ts:125`), so a round-trip is
  pointless.

### ARC-60 origin binding (SIWA)

The extension enforces SIWA origin binding: `isArc60OriginMismatch`
(`arc60-wire.ts:182`) rejects a request whose self-asserted `domain` does not
match the platform-verified page origin. Mobile/WalletConnect cannot do this
(peer URL is self-asserted), so an ARC-60 request that succeeds on mobile may be
rejected by the extension.

**Decision: pre-validate in Connect.** `ExtensionTransport.signArc60Data` checks
`payload.domain` against `window.location.origin` *before* posting, throwing
early on mismatch for fast, actionable feedback. To minimize drift from the
extension's authority, it reuses the extension's host-extraction semantics:
scheme-prefix a bare authority, and treat any userinfo (`user@host`) as a
mismatch (fail safe). This is a client-side convenience; the extension remains
the enforcing authority.

## 6. Storage & types

- `PeraWalletType` (`src/util/peraWalletTypes.ts:1`) += `"pera-wallet-extension"`.
- `PeraWalletPlatformType` (line 2) += `"extension"`.
- `getWalletPlatformFromStorage` (`storageUtils.ts:61`) maps the new type →
  `"extension"`.
- `saveWalletDetailsToStorage` (`storageUtils.ts:11`) accepts the new type.
- No `walletconnect` session object is written for the extension path;
  per-origin permission lives in the extension's own store.

## 7. Connect flow & modal (extension pre-selected)

Today the connect modal opens only as a side effect of WalletConnect's
`qrcodeModal.open(uri)` callback (`peraWalletConnectModalUtils.ts:62`,
`PeraWalletConnect.ts:193`). The extension path produces no WC URI, so we
decouple modal-opening from WalletConnect.

`connect()` sequence:

1. Run `discover()` first (fast, ~300ms), gated by `shouldPreferExtension`
   (default `true`).
2. Still create the WalletConnect session so the QR URI is primed for the
   fallback tab — but modal *contents/visibility* are no longer solely driven by
   the `qrcodeModal` callback.
3. Open the connect modal directly, passing `is-extension-available` and the
   discovered provider name/icon.
4. `PeraWalletConnectModalDesktopMode` renders a third accordion item —
   `#extension-wallet-option`, "Connect with **Pera Extension**" — **only when
   detected**, as the `--active` (pre-expanded) item above Pera Web and Pera
   Mobile. Its button invokes `ExtensionTransport.connect()`. QR and Pera Web
   remain exactly as today.
5. On extension connect success, resolve `connect()`'s account promise and set
   the active transport to the extension.

UX (desktop):

```
┌─ Connect to Pera ─────────┐
│  🧩 Pera Extension detected │
│  [ Connect with Extension ] │ ← primary / pre-expanded
│  ─────── or ───────         │
│  ▸ Connect with Pera Web    │
│  ▸ Scan QR (Pera Mobile)    │
└─────────────────────────────┘
```

Touch-screen / webview modes are unchanged (the extension is desktop-only).

## 8. Session lifecycle

- **connect** → discover → (if present & preferred) modal pre-selects extension
  → user confirms in the extension's popup → `enable` → store accounts.
- **reconnect** → if stored type is `"pera-wallet-extension"`, `discover` to
  confirm the extension is still installed, then resolve with stored accounts.
  The extension enforces per-origin permission on the next real call; a `4100`
  there triggers a clean `disconnect()`. No WC bridge revival on this path.
- **disconnect** → if extension, `disable` then clear storage.

## 9. Public API additions (backward compatible)

- `PeraWalletConnect.isExtensionAvailable(): Promise<boolean>` — public wrapper
  over `discover()`; lets dApps render their own "extension detected" hint.
- Constructor option `shouldPreferExtension?: boolean` (default `true`) — escape
  hatch to disable auto-detect/pre-selection without code changes.
- All existing method signatures and defaults are unchanged; existing dApps see
  no behavior change beyond the new pre-selected option appearing when the
  extension is present.

## 10. Testing strategy

- **Regression harness first.** Pin current mobile and web `connect` /
  `signTransaction` / `signData` / `signArc60Data` behavior with tests against
  the `WalletTransport` boundary *before* extracting `MobileTransport` /
  `WebTransport`, and re-run after.
- **`arc0027Client` unit tests** with a fake `window.postMessage` peer: discover
  hit/timeout, `requestId` correlation, foreign-message rejection, listener
  cleanup, and error-code → `PeraWalletConnectError` mapping.
- **`ExtensionTransport` unit tests**: enable→store, sign_transactions decode,
  signArc60Data wire-shape equivalence with the mobile `wireParams`, signData
  fail-fast, ARC-60 origin-mismatch pre-validation (match + mismatch +
  userinfo-smuggling cases).
- **Integration reference**: the extension repo's
  `apps/extension/e2e/dapp-connect.spec.ts` Playwright harness.

## 11. Cross-repo coordination

- **No schema co-design needed** — ARC-60 wire shapes already match. The
  coordination item is a shared fixture/contract test so the two repos don't
  drift: a canonical ARC-60 `sign_message` request + expected `signature`
  verifiable by Connect's `verifyArc60Signature`.
- Confirm the extension's `discover` response field name for the icon
  (`icon` vs `iconUrl`) before wiring the modal — the router builds
  `iconUrl` (`router.ts` / `DiscoverInfo`) while `arc0027-types` referenced
  `icon`; the client should tolerate both.

## 12. Out of scope / future

- Liquid Auth as a fourth `WalletTransport`.
- `post_transactions` / `sign_and_post_transactions` when the extension adds them.
- Legacy arbitrary-data `sign_message` when the extension lifts its v1 restriction.
- Multi-network discovery.
