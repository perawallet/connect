# Pera Connect

`@perawallet/connect`: the JavaScript SDK dApps use to connect to Pera Wallet and sign with it. Published to npm and consumed directly and through use-wallet, so the public API and the messages sent to the wallet are contracts. **Always use `pnpm`.**

```sh
pnpm test                    # Vitest on jsdom; pass a path while iterating: pnpm vitest run src/util/storage
pnpm lint && pnpm typecheck  # Fast checks; also run by the pre-push hook
pnpm verify                  # Everything CI runs: lint, type-aware lint, format, typecheck, coverage, build, package check
pnpm format                  # oxfmt; never hand-format
```

## Architecture

- `src/PeraWalletConnect.ts`: the public class. Orchestration only: it picks a transport for the stored session and delegates the work to `util/*`.
- `src/transport/`: one `WalletTransport` per wallet. `MobileTransport` (WalletConnect v1 to Pera Mobile), `WebTransport` (Pera Web in a new tab), `extension/ExtensionTransport` (the browser extension's `window.pera` provider). `arc60Wire.ts` is the ARC-60 wire format the mobile wallet and the extension share.
- `src/modal/`: the connect modal, redirect modal and signing toast, as custom elements with shadow DOM. Registered by `App.ts`, which `index.ts` loads lazily so server-side rendering never touches `customElements`.
- `src/util/`: pure logic, grouped by domain (`algod`, `arc60`, `signature`, `storage`, `transaction`, …). New logic goes here, with unit tests, not into the class.
- `src/index.ts` is the whole public surface. Anything not exported there is internal and free to change.

## Rules

- **Public API.** Exports from `src/index.ts`, `PeraWalletConnect`'s public members and the `error.data.type` values dApps match on are semver contracts. Additions are minor; changes and removals are majors.
- **Wire compatibility.** Request shapes sent to Pera Mobile, Pera Web and the extension must stay readable by wallets already installed. Change them only together with the wallet side.
- **Errors.** Throw `PeraWalletConnectError` with a `data.type` from its union; dApps branch on the type, not the message.
- **Imports.** Relative imports carry a `.js` extension (`import { x } from './x.js'`), which keeps the emitted declarations resolvable under `node16`/`nodenext`; oxlint enforces it.
- **TypeScript.** Strict, no `any`, named exports only, type-only imports marked `type`. Floating promises are errors; use `void` when fire-and-forget is intended.
- **Dependencies.** Runtime dependencies are bundled as externals and ship to every dApp, so add one only when it pays for itself. pnpm installs nothing younger than seven days (`pnpm-workspace.yaml`).

## Comments and docs

The code says what; comments say why, and only when the why isn't obvious. Keep rationale, traps and units the type can't express. Don't write restatements, JSDoc that repeats the signature, banners, ticket references or change narration; git holds history. Keep JSDoc on public API members where it carries constraints or gotchas, since it ships in the `.d.ts`.

## Testing

Vitest on jsdom. Files are `*.spec.ts` in a colocated `__tests__/` folder, written Arrange-Act-Assert. Test behaviour through the public class or the `util/*` function that owns it; mock the network edge (`getPeraConnectConfig`, `fetch`, the WalletConnect connector, `window.pera`), not our own modules. Coverage is gated at 80% (`vitest.config.ts`); the modal UI is excluded.

## Work completion

1. `pnpm verify` passes.
2. New behaviour has tests.
3. Public API or wire changes are reflected in `README.md`.
