# Integration tests

Whole user flows, driven only through the public entry point (`../index.js`), with the real modal custom elements, real `localStorage` and real algosdk keys and transactions. Unit tests in `__tests__/` cover the pieces; these check that the pieces add up to what a dApp and its user see.

```sh
pnpm test:integration
```

## What is real and what is faked

Everything inside the SDK is real. Only the outside world is replaced, in `harness/`:

| Outside world                         | Fake                   | Notes                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WalletConnect v1 client               | `fakeWalletConnect.ts` | Keeps the v1 behaviour the SDK relies on: `createSession()` opens the `qrcodeModal` with the pairing URI, `connect` closes it, the session is persisted under `storageId` and restored by a later connector, and decline / `killSession()` / wallet-side end all surface as `disconnect`. `walletConnectRelay` plays the bridge. |
| Pera Mobile                           | `fakePeraMobile.ts`    | Scans the URI read from the modal, then answers `algo_signTxn`, `algo_signData` (array and ARC-60 object) and `algo_getEmptySignatures` with real signatures. Requests wait until the test approves or rejects them, so the UI can be checked mid-flight.                                                                        |
| Pera extension (`window.pera`)        | `fakePeraExtension.ts` | A first-time `connect()` needs user activation, which `clickAsUser` grants only during the click's synchronous dispatch.                                                                                                                                                                                                         |
| `config.json` and algod               | `fakeNetwork.ts`       | Stubs `fetch`. Anything else answers 404, so nothing reaches the internet.                                                                                                                                                                                                                                                       |
| `qr-code-styling`, `lottie-web-light` | `fakeRendering.ts`     | jsdom can't render them. The QR fake records the data it would encode.                                                                                                                                                                                                                                                           |

Pera Web (a new tab plus `postMessage`) isn't driven. Where a flow needs a Pera Web session, `seedStoredWebSession` writes one to storage.

## Flows

| File                             | Flow                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `connect.mobile.spec.ts`         | QR pairing: the modal shows the URI, the wallet approves, the session is persisted   |
| `connect.modalClosed.spec.ts`    | The header close button rejects `CONNECT_MODAL_CLOSED`                               |
| `connect.extension.spec.ts`      | Extension option, `window.pera.connect()` inside the click, the abandoned QR pairing |
| `reconnect.spec.ts`              | Reloading and `reconnectSession()` for mobile, extension and web                     |
| `signTransaction.mobile.spec.ts` | Sign toast, redirect modal, tampered result, ATC `transactionSigner`                 |
| `signData.spec.ts`               | `signData` with verification (including rekeyed accounts), ARC-60                    |
| `walletDisconnect.spec.ts`       | Wallet-side ends, `networkChanged`, `dispose()`                                      |
| `emptySignatures.spec.ts`        | `getEmptySignatures` over mobile, extension and web                                  |
| `disconnect.spec.ts`             | `disconnect()`, then connecting again                                                |

`it.todo` entries mark behaviour that is currently wrong. Each one has a comment that describes the bug.

## Adding a flow

1. Create `<flow>.spec.ts` here. Copy the three `vi.mock(...)` blocks from an existing spec. `vi.mock` is hoisted per file, so a helper can't declare them for you.
2. Call `useIntegrationEnvironment()` inside the `describe`. It gives every test an empty page: no modals, no storage, no `window.pera`, no sessions, the default config and real timers. It returns `{ network }` so a test can change `network.config` or algod accounts. Change the config before `new PeraWalletConnect()`, because the constructor fetches it.
3. Arrange with the helpers in `harness/flows.ts` (`connectWithPeraMobile`, `connectWithPeraExtension`, `openConnectModal`). Act through the public API, then assert on what the user and the dApp see: resolved values, `error.data.type`, `harness/modalDom.ts` queries, `harness/storage.ts` reads, events.
4. Use `waitFor`/`tick` (`harness/flush.ts`) instead of sleeping. When a flow has a real timeout (the 2 s webview probe on phones, the 30 s empty-signatures timeout), use `vi.useFakeTimers()` and advance the clock.

A test may leave `connect()` pending if it started it with `openConnectModal`. The environment clicks the modal's close button after each test, which settles the call and removes its listeners.

The redirect-modal test logs `Not implemented: navigation to another Document`. That is jsdom reporting the Pera deep link the modal opens, and it is expected.
