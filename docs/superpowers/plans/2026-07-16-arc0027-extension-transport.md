# ARC-0027 Browser-Extension Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `@perawallet/connect` auto-detect and drive a co-located ARC-0027 Pera browser extension from a dApp page, with the existing WalletConnect-QR and Pera-Web flows preserved as fallbacks.

**Architecture:** Introduce a `WalletTransport` interface and move the three connection strategies behind it — `MobileTransport` (WalletConnect), `WebTransport` (Teller/postMessage), and a new `ExtensionTransport` (ARC-0027 over `window.postMessage`). `PeraWalletConnect` becomes a thin orchestrator that runs `discover()` on `connect()`, pre-selects the extension in the existing modal when present, and delegates all public methods to the active transport.

**Tech Stack:** TypeScript, Rollup, Vitest + jsdom, `@perawallet/walletconnect`, `algosdk`, web components (custom elements + shadow DOM).

## Global Constraints

- Package is ESM-only, published as `@perawallet/connect`; entry point `src/index.ts`. (copied from `package.json`)
- All existing public method signatures on `PeraWalletConnect` MUST remain unchanged; existing dApps see no behavior change unless the extension is present.
- Tests use Vitest, live in `src/**/__tests__/**/*.test.ts`, run with `pnpm test` (env: jsdom). (from `vitest.config.ts`)
- Errors thrown to consumers MUST be `PeraWalletConnectError` with a `type` from the union in `src/util/PeraWalletConnectError.ts` (extended in Task 1).
- Lint gate: `pnpm run eslint` must pass (no-magic-numbers, max-lines rules are active — disable per-line only where the existing code already does).
- ARC-60 wire shape sent to the extension MUST be byte-identical to the object built in `PeraWalletConnect.signArc60Data` today (`data`, `signer`, `domain`, `authenticatorData` as base64/string; optional `requestId`/`hdPath`; `metadata: {scope, encoding}`).

---

## File Structure

**Create:**
- `src/transport/WalletTransport.ts` — the `WalletTransport` interface + `ConnectOptions` type.
- `src/transport/extension/arc0027Types.ts` — Connect-side mirror of the ARC-0027 envelope/method/error types.
- `src/transport/extension/arc0027Client.ts` — framework-free `window.postMessage` request/response client (`discover`, `enable`, `disable`, `signTransactions`, `signMessage`).
- `src/transport/extension/originBinding.ts` — host extraction + ARC-60 origin-mismatch check (mirrors the extension's `isArc60OriginMismatch`).
- `src/transport/extension/ExtensionTransport.ts` — implements `WalletTransport` over `arc0027Client`.
- `src/transport/MobileTransport.ts` — WalletConnect strategy (moved from `PeraWalletConnect`).
- `src/transport/WebTransport.ts` — Pera Web / Teller strategy (moved from `PeraWalletConnect`).
- Test files under matching `__tests__/` folders.

**Modify:**
- `src/util/peraWalletTypes.ts` — add `"pera-wallet-extension"` / `"extension"`.
- `src/util/storage/storageUtils.ts` — accept the new wallet type; map to `"extension"` platform.
- `src/util/PeraWalletConnectError.ts` — add error types used by the extension path.
- `src/PeraWalletConnect.ts` — become the orchestrator; add `isExtensionAvailable()` + `shouldPreferExtension`.
- `src/modal/peraWalletConnectModalUtils.ts` — thread `isExtensionAvailable` + provider name into the modal.
- `src/modal/mode/desktop/PeraWalletConnectModalDesktopMode.ts` — render the pre-selected extension accordion item.
- `src/index.ts` — export any new public types.

---

## Task 1: Storage & type foundations for the extension platform

**Files:**
- Modify: `src/util/peraWalletTypes.ts:1-2`
- Modify: `src/util/storage/storageUtils.ts:11-23,61-72`
- Modify: `src/util/PeraWalletConnectError.ts:1-25`
- Test: `src/util/storage/__tests__/storageUtils.test.ts`

**Interfaces:**
- Produces: `PeraWalletType` now includes `"pera-wallet-extension"`; `PeraWalletPlatformType` now includes `"extension"`; `saveWalletDetailsToStorage(accounts, type?)` accepts `"pera-wallet-extension"`; `getWalletPlatformFromStorage()` returns `"extension"` for that type.

- [ ] **Step 1: Write the failing test**

Add to `src/util/storage/__tests__/storageUtils.test.ts`:

```ts
import {describe, it, expect, afterEach} from "vitest";
import {
  saveWalletDetailsToStorage,
  getWalletPlatformFromStorage,
  resetWalletDetailsFromStorage
} from "../storageUtils";

describe("extension platform mapping", () => {
  afterEach(() => resetWalletDetailsFromStorage());

  it("maps the pera-wallet-extension type to the 'extension' platform", () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

    expect(getWalletPlatformFromStorage()).toBe("extension");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/util/storage/__tests__/storageUtils.test.ts`
Expected: FAIL — type error / `getWalletPlatformFromStorage` returns `null`.

- [ ] **Step 3: Extend the types**

In `src/util/peraWalletTypes.ts` replace lines 1-2:

```ts
type PeraWalletType = "pera-wallet" | "pera-wallet-web" | "pera-wallet-extension";
type PeraWalletPlatformType = "mobile" | "web" | "extension" | null;
```

- [ ] **Step 4: Update storage helpers**

In `src/util/storage/storageUtils.ts`, change the `saveWalletDetailsToStorage` signature (line 11-13) to accept the new type:

```ts
function saveWalletDetailsToStorage(
  accounts: string[],
  type?: "pera-wallet" | "pera-wallet-web" | "pera-wallet-extension"
) {
```

Add a branch to `getWalletPlatformFromStorage` (after line 67, the `pera-wallet-web` branch):

```ts
  } else if (walletDetails?.type === "pera-wallet-extension") {
    walletType = "extension";
  }
```

- [ ] **Step 5: Add error types**

In `src/util/PeraWalletConnectError.ts`, add to the `type` union (after `"OPERATION_CANCELLED"`, line 4):

```ts
    | "EXTENSION_NOT_AVAILABLE"
    | "EXTENSION_UNSUPPORTED_OPERATION"
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test -- src/util/storage/__tests__/storageUtils.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/util/peraWalletTypes.ts src/util/storage/storageUtils.ts src/util/PeraWalletConnectError.ts src/util/storage/__tests__/storageUtils.test.ts
git commit -m "feat: add extension wallet type + platform mapping"
```

---

## Task 2: ARC-0027 postMessage client

**Files:**
- Create: `src/transport/extension/arc0027Types.ts`
- Create: `src/transport/extension/arc0027Client.ts`
- Test: `src/transport/extension/__tests__/arc0027Client.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `type Arc0027Method = "discover" | "enable" | "disable" | "sign_transactions" | "post_transactions" | "sign_and_post_transactions" | "sign_message"`
  - `interface Arc0027ResponseEnvelope { id: string; requestId: string; reference: string; result?: Record<string, unknown>; error?: {code: number; message: string; data?: unknown} }`
  - `interface DiscoverResult { providerId: string; name: string; icon?: string; iconUrl?: string; networks: {genesisId: string; genesisHash: string}[] }`
  - `class Arc0027Client { constructor(target?: Window); discover(timeoutMs?: number): Promise<DiscoverResult | null>; request(method: Arc0027Method, params: Record<string, unknown>, timeoutMs?: number): Promise<Record<string, unknown>> }`
  - `class Arc0027RequestError extends Error { code: number }`

- [ ] **Step 1: Write the types file**

Create `src/transport/extension/arc0027Types.ts`:

```ts
export type Arc0027Method =
  | "discover"
  | "enable"
  | "disable"
  | "sign_transactions"
  | "post_transactions"
  | "sign_and_post_transactions"
  | "sign_message";

export interface Arc0027RequestEnvelope {
  id: string;
  reference: string;
  params?: Record<string, unknown>;
}

export interface Arc0027ResponseEnvelope {
  id: string;
  requestId: string;
  reference: string;
  result?: Record<string, unknown>;
  error?: {code: number; message: string; data?: unknown};
}

export interface DiscoverResult {
  providerId: string;
  name: string;
  // The extension router builds `iconUrl`; arc0027-types references `icon`.
  // Tolerate both until the extension side is confirmed (see spec §11).
  icon?: string;
  iconUrl?: string;
  networks: {genesisId: string; genesisHash: string}[];
}

export const ARC0027_ERROR_CODES = {
  UnknownError: 4000,
  MethodCanceledError: 4001,
  MethodTimedOutError: 4002,
  MethodNotSupportedError: 4003,
  NetworkNotSupportedError: 4004,
  UnauthorizedSignerError: 4100,
  InvalidInputError: 4200
} as const;

export function buildReference(method: Arc0027Method, kind: "request" | "response") {
  return `arc0027:${method}:${kind}`;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/transport/extension/__tests__/arc0027Client.test.ts`:

```ts
import {describe, it, expect, afterEach, vi} from "vitest";
import {Arc0027Client, Arc0027RequestError} from "../arc0027Client";
import {buildReference} from "../arc0027Types";

// Auto-responder: listens for a posted request and replies with a matching
// response envelope whose requestId correlates to the request id.
function autoRespond(makeResult: (req: any) => object) {
  const handler = (event: MessageEvent) => {
    const req = event.data;
    if (typeof req?.reference !== "string" || !req.reference.endsWith(":request")) {
      return;
    }
    const method = req.reference.split(":")[1];
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          id: "resp-id",
          requestId: req.id,
          reference: buildReference(method, "response"),
          ...makeResult(req)
        }
      })
    );
  };

  window.addEventListener("message", handler);

  return () => window.removeEventListener("message", handler);
}

describe("Arc0027Client", () => {
  afterEach(() => vi.useRealTimers());

  it("discover resolves the provider info on a matching response", async () => {
    const stop = autoRespond(() => ({
      result: {providerId: "pera-wallet", name: "Pera Wallet", networks: []}
    }));

    const client = new Arc0027Client(window);
    const info = await client.discover(500);

    expect(info?.providerId).toBe("pera-wallet");
    stop();
  });

  it("discover resolves null on timeout when nothing responds", async () => {
    const client = new Arc0027Client(window);

    await expect(client.discover(20)).resolves.toBeNull();
  });

  it("ignores responses whose requestId does not correlate", async () => {
    const handler = (event: MessageEvent) => {
      if (event.data?.reference?.endsWith(":request")) {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: {
              id: "x",
              requestId: "SOMETHING-ELSE",
              reference: buildReference("enable", "response"),
              result: {accounts: []}
            }
          })
        );
      }
    };
    window.addEventListener("message", handler);

    const client = new Arc0027Client(window);

    await expect(client.request("enable", {}, 20)).rejects.toBeInstanceOf(
      Arc0027RequestError
    );
    window.removeEventListener("message", handler);
  });

  it("rejects with an Arc0027RequestError carrying the error code", async () => {
    const stop = autoRespond(() => ({
      error: {code: 4001, message: "User canceled"}
    }));

    const client = new Arc0027Client(window);

    await expect(client.request("enable", {})).rejects.toMatchObject({
      code: 4001,
      message: "User canceled"
    });
    stop();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- src/transport/extension/__tests__/arc0027Client.test.ts`
Expected: FAIL — `Cannot find module '../arc0027Client'`.

- [ ] **Step 4: Implement the client**

Create `src/transport/extension/arc0027Client.ts`:

```ts
import {
  Arc0027Method,
  Arc0027RequestEnvelope,
  Arc0027ResponseEnvelope,
  DiscoverResult,
  ARC0027_ERROR_CODES,
  buildReference
} from "./arc0027Types";

// eslint-disable-next-line no-magic-numbers
const DEFAULT_DISCOVER_TIMEOUT = 300;
// The extension shows its own approval popup; match its 120s ceiling.
// eslint-disable-next-line no-magic-numbers
const DEFAULT_REQUEST_TIMEOUT = 120_000;

export class Arc0027RequestError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = "Arc0027RequestError";
    this.code = code;
  }
}

function generateRequestId(): string {
  // No crypto.randomUUID dependency assumption; unique enough for correlation.
  // eslint-disable-next-line no-magic-numbers
  return `pera-connect-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export class Arc0027Client {
  private target: Window;

  constructor(target: Window = window) {
    this.target = target;
  }

  discover(timeoutMs = DEFAULT_DISCOVER_TIMEOUT): Promise<DiscoverResult | null> {
    return this.request("discover", {}, timeoutMs)
      .then((result) => result as unknown as DiscoverResult)
      .catch(() => null);
  }

  request(
    method: Arc0027Method,
    params: Record<string, unknown>,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const id = generateRequestId();
      const envelope: Arc0027RequestEnvelope = {
        id,
        reference: buildReference(method, "request"),
        params
      };

      let timer: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        clearTimeout(timer);
      };

      const onMessage = (event: MessageEvent) => {
        const data = event.data as Arc0027ResponseEnvelope | undefined;

        if (!data || typeof data !== "object") return;
        if (data.requestId !== id) return;
        if (typeof data.reference !== "string" || !data.reference.endsWith(":response")) {
          return;
        }

        cleanup();

        if (data.error) {
          reject(new Arc0027RequestError(data.error.code, data.error.message));

          return;
        }

        resolve(data.result ?? {});
      };

      window.addEventListener("message", onMessage);

      timer = setTimeout(() => {
        cleanup();
        reject(
          new Arc0027RequestError(
            ARC0027_ERROR_CODES.MethodTimedOutError,
            `ARC-0027 ${method} request timed out`
          )
        );
      }, timeoutMs);

      this.target.postMessage(envelope, "*");
    });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- src/transport/extension/__tests__/arc0027Client.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/transport/extension/arc0027Types.ts src/transport/extension/arc0027Client.ts src/transport/extension/__tests__/arc0027Client.test.ts
git commit -m "feat: add ARC-0027 postMessage client"
```

---

## Task 3: ARC-60 origin-binding guard

**Files:**
- Create: `src/transport/extension/originBinding.ts`
- Test: `src/transport/extension/__tests__/originBinding.test.ts`

**Interfaces:**
- Produces: `hostFromMaybeUrl(value: string): string`; `isArc60OriginMismatch(domain: string, verifiedOrigin: string | undefined): boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/transport/extension/__tests__/originBinding.test.ts`:

```ts
import {describe, it, expect} from "vitest";
import {isArc60OriginMismatch} from "../originBinding";

describe("isArc60OriginMismatch", () => {
  it("returns false when domain host matches the verified origin host", () => {
    expect(isArc60OriginMismatch("arc60.io", "https://arc60.io/login")).toBe(false);
  });

  it("returns true when hosts differ", () => {
    expect(isArc60OriginMismatch("evil.com", "https://arc60.io")).toBe(true);
  });

  it("treats userinfo smuggling as a mismatch (fail safe)", () => {
    expect(isArc60OriginMismatch("arc60.io@evil.com", "https://evil.com")).toBe(true);
  });

  it("returns false when there is no verified origin", () => {
    expect(isArc60OriginMismatch("arc60.io", undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/transport/extension/__tests__/originBinding.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement (ported from the extension's arc60-wire.ts)**

Create `src/transport/extension/originBinding.ts`:

```ts
// Ported from pera-browser-extension packages/signing/src/utils/arc60-wire.ts
// so the client-side pre-check matches the extension's enforcing logic.
export function hostFromMaybeUrl(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const candidate = trimmed.includes("//") ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);

    // Userinfo smuggling ("trusted.com@evil.com") is never legitimate; return
    // the raw string so the comparison fails safe (reports a mismatch).
    if (url.username || url.password) {
      return trimmed;
    }

    return url.host;
  } catch {
    return trimmed;
  }
}

export function isArc60OriginMismatch(
  domain: string,
  verifiedOrigin: string | undefined
): boolean {
  if (!verifiedOrigin) {
    return false;
  }

  return hostFromMaybeUrl(domain) !== hostFromMaybeUrl(verifiedOrigin);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/transport/extension/__tests__/originBinding.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/transport/extension/originBinding.ts src/transport/extension/__tests__/originBinding.test.ts
git commit -m "feat: add ARC-60 origin-binding guard"
```

---

## Task 4: WalletTransport interface + ExtensionTransport

**Files:**
- Create: `src/transport/WalletTransport.ts`
- Create: `src/transport/extension/ExtensionTransport.ts`
- Test: `src/transport/extension/__tests__/ExtensionTransport.test.ts`

**Interfaces:**
- Consumes: `Arc0027Client` (Task 2), `isArc60OriginMismatch` (Task 3), `saveWalletDetailsToStorage`/`resetWalletDetailsFromStorage` (Task 1), models from `src/util/model/peraWalletModels.ts`, `base64ToUint8Array` from `src/util/transaction/transactionUtils.ts`.
- Produces:
  - `type ConnectOptions = {selectedAccount?: string}`
  - `interface WalletTransport { readonly platform: PeraWalletPlatformType; connect(opts?: ConnectOptions): Promise<string[]>; reconnect(): Promise<string[]>; disconnect(): Promise<void>; signTransaction(txns: PeraWalletTransaction[], signerAddress?: string): Promise<Uint8Array[]>; signData(data: PeraWalletArbitraryData[], signer: string, chainId: AlgorandChainIDs): Promise<Uint8Array[]>; signArc60Data(payload: PeraWalletArc60SignData, verifySignature?: boolean): Promise<PeraWalletArc60SignDataResponse> }`
  - `class ExtensionTransport implements WalletTransport` with a `constructor(client?: Arc0027Client)`, plus `static discover(client?: Arc0027Client): Promise<DiscoverResult | null>`.

- [ ] **Step 1: Write the interface file**

Create `src/transport/WalletTransport.ts`:

```ts
import {AlgorandChainIDs, PeraWalletPlatformType} from "../util/peraWalletTypes";
import {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  PeraWalletTransaction
} from "../util/model/peraWalletModels";

export type ConnectOptions = {selectedAccount?: string};

export interface WalletTransport {
  readonly platform: PeraWalletPlatformType;
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

- [ ] **Step 2: Write the failing test**

Create `src/transport/extension/__tests__/ExtensionTransport.test.ts`:

```ts
import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";
import {ExtensionTransport} from "../ExtensionTransport";
import {ScopeType} from "../../../util/model/peraWalletModels";
import {resetWalletDetailsFromStorage} from "../../../util/storage/storageUtils";

// A generated account gives us a real address for signer fields.
const account = algosdk.generateAccount();

function makeClient(request: any) {
  return {request, discover: vi.fn()} as any;
}

describe("ExtensionTransport", () => {
  afterEach(() => resetWalletDetailsFromStorage());

  it("connect() enables and returns accounts", async () => {
    const client = makeClient(
      vi.fn().mockResolvedValue({accounts: [{address: account.addr}]})
    );
    const transport = new ExtensionTransport(client);

    const accounts = await transport.connect();

    expect(accounts).toEqual([account.addr]);
    expect(client.request).toHaveBeenCalledWith("enable", expect.any(Object));
  });

  it("signTransaction() decodes base64 stxns to Uint8Array", async () => {
    const b64 = Buffer.from([1, 2, 3]).toString("base64");
    const client = makeClient(vi.fn().mockResolvedValue({stxns: [b64]}));
    const transport = new ExtensionTransport(client);

    const signed = await transport.signTransaction([{txn: "AA=="}]);

    expect(Array.from(signed[0])).toEqual([1, 2, 3]);
  });

  it("signData() fails fast with EXTENSION_UNSUPPORTED_OPERATION", async () => {
    const client = makeClient(vi.fn());
    const transport = new ExtensionTransport(client);

    // eslint-disable-next-line no-magic-numbers
    await expect(
      transport.signData([{data: new Uint8Array([1]), message: "m"}], account.addr, 4160)
    ).rejects.toMatchObject({data: {type: "EXTENSION_UNSUPPORTED_OPERATION"}});
    expect(client.request).not.toHaveBeenCalled();
  });

  it("signArc60Data() sends the ARC-60 wire shape as sign_message params", async () => {
    const sigB64 = Buffer.from([9, 9]).toString("base64");
    const requestFn = vi.fn().mockResolvedValue({signature: sigB64});
    const transport = new ExtensionTransport(makeClient(requestFn));

    // domain must match window.location.origin (jsdom default: http://localhost)
    const domain = window.location.origin;

    await transport.signArc60Data({
      data: new Uint8Array([1, 2]),
      signer: account.addr,
      domain,
      authenticatorData: new Uint8Array(37),
      metadata: {scope: ScopeType.AUTH, encoding: "base64"}
    });

    const [method, params] = requestFn.mock.calls[0];
    expect(method).toBe("sign_message");
    expect(typeof params.data).toBe("string"); // base64
    expect(typeof params.authenticatorData).toBe("string"); // base64
    expect(params.signer).toBe(account.addr);
    expect(params.metadata).toEqual({scope: ScopeType.AUTH, encoding: "base64"});
  });

  it("signArc60Data() rejects on origin mismatch before calling the extension", async () => {
    const requestFn = vi.fn();
    const transport = new ExtensionTransport(makeClient(requestFn));

    await expect(
      transport.signArc60Data({
        data: new Uint8Array([1]),
        signer: account.addr,
        domain: "https://evil.example",
        authenticatorData: new Uint8Array(37),
        metadata: {scope: ScopeType.AUTH, encoding: "base64"}
      })
    ).rejects.toBeTruthy();
    expect(requestFn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- src/transport/extension/__tests__/ExtensionTransport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement ExtensionTransport**

Create `src/transport/extension/ExtensionTransport.ts`:

```ts
import algosdk from "algosdk";

import {WalletTransport, ConnectOptions} from "../WalletTransport";
import {Arc0027Client, Arc0027RequestError} from "./arc0027Client";
import {DiscoverResult, ARC0027_ERROR_CODES} from "./arc0027Types";
import {isArc60OriginMismatch} from "./originBinding";
import PeraWalletConnectError from "../../util/PeraWalletConnectError";
import {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  PeraWalletTransaction
} from "../../util/model/peraWalletModels";
import {AlgorandChainIDs} from "../../util/peraWalletTypes";
import {base64ToUint8Array} from "../../util/transaction/transactionUtils";
import {
  saveWalletDetailsToStorage,
  resetWalletDetailsFromStorage
} from "../../util/storage/storageUtils";

function mapError(error: unknown, context: "connect" | "sign"): PeraWalletConnectError {
  if (error instanceof Arc0027RequestError) {
    if (error.code === ARC0027_ERROR_CODES.MethodCanceledError) {
      return new PeraWalletConnectError(
        {type: context === "connect" ? "CONNECT_MODAL_CLOSED" : "SIGN_TXN_CANCELLED"},
        error.message
      );
    }

    if (error.code === ARC0027_ERROR_CODES.UnauthorizedSignerError) {
      return new PeraWalletConnectError({type: "SESSION_RECONNECT"}, error.message);
    }
  }

  return new PeraWalletConnectError(
    {type: "SIGN_TRANSACTIONS", detail: error},
    (error as Error)?.message || "ARC-0027 request failed"
  );
}

export class ExtensionTransport implements WalletTransport {
  readonly platform = "extension" as const;
  private client: Arc0027Client;

  constructor(client: Arc0027Client = new Arc0027Client()) {
    this.client = client;
  }

  static discover(
    client: Arc0027Client = new Arc0027Client()
  ): Promise<DiscoverResult | null> {
    return client.discover();
  }

  async connect(_opts?: ConnectOptions): Promise<string[]> {
    try {
      const result = await this.client.request("enable", {});
      const accounts = ((result.accounts as {address: string}[]) || []).map(
        (item) => item.address
      );

      saveWalletDetailsToStorage(accounts, "pera-wallet-extension");

      return accounts;
    } catch (error) {
      throw mapError(error, "connect");
    }
  }

  async reconnect(): Promise<string[]> {
    // The extension is the source of truth for per-origin permission. Confirm
    // it is still installed; the next real call re-checks the grant (4100 →
    // caller disconnects). Return whatever is stored.
    const info = await this.client.discover();

    if (!info) {
      await resetWalletDetailsFromStorage();

      return [];
    }

    // Accounts are read from storage by the orchestrator; nothing to re-fetch.
    return [];
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.request("disable", {});
    } catch {
      // Best-effort; clear local state regardless.
    }

    await resetWalletDetailsFromStorage();
  }

  async signTransaction(
    txns: PeraWalletTransaction[],
    _signerAddress?: string
  ): Promise<Uint8Array[]> {
    try {
      const result = await this.client.request("sign_transactions", {txns});
      const stxns = (result.stxns as (string | null)[]) || [];

      return stxns
        .filter((value): value is string => typeof value === "string")
        .map(base64ToUint8Array);
    } catch (error) {
      throw mapError(error, "sign");
    }
  }

  async signData(
    _data: PeraWalletArbitraryData[],
    _signer: string,
    _chainId: AlgorandChainIDs
  ): Promise<Uint8Array[]> {
    throw new PeraWalletConnectError(
      {type: "EXTENSION_UNSUPPORTED_OPERATION"},
      "Arbitrary-data signing is not supported by the Pera extension; use signArc60Data, or connect via Pera mobile / Pera Web"
    );
  }

  async signArc60Data(
    payload: PeraWalletArc60SignData,
    verifySignature?: boolean
  ): Promise<PeraWalletArc60SignDataResponse> {
    // Fast client-side pre-check mirroring the extension's SIWA origin binding.
    if (isArc60OriginMismatch(payload.domain, window.location.origin)) {
      throw new PeraWalletConnectError(
        {type: "SIGN_DATA_NETWORK_MISMATCH"},
        `ARC-60 domain "${payload.domain}" does not match the page origin "${window.location.origin}"`
      );
    }

    const dataBase64 = Buffer.from(payload.data).toString("base64");
    const wireParams: Record<string, unknown> = {
      data: dataBase64,
      signer: payload.signer,
      domain: payload.domain,
      authenticatorData: Buffer.from(payload.authenticatorData).toString("base64"),
      metadata: payload.metadata
    };

    if (payload.requestId !== undefined) wireParams.requestId = payload.requestId;
    if (payload.hdPath !== undefined) wireParams.hdPath = payload.hdPath;

    try {
      const result = await this.client.request("sign_message", wireParams);
      const signature = base64ToUint8Array(result.signature as string);

      // Signature verification is delegated to the orchestrator
      // (PeraWalletConnect.verifyArc60Signature) so all transports share one
      // path; `verifySignature` is accepted here for interface parity.
      void verifySignature;

      return {
        data: dataBase64,
        signer: algosdk.decodeAddress(payload.signer).publicKey,
        domain: payload.domain,
        authenticatorData: payload.authenticatorData,
        ...(payload.requestId !== undefined && {requestId: payload.requestId}),
        ...(payload.hdPath !== undefined && {hdPath: payload.hdPath}),
        signature
      };
    } catch (error) {
      throw mapError(error, "sign");
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- src/transport/extension/__tests__/ExtensionTransport.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/transport/WalletTransport.ts src/transport/extension/ExtensionTransport.ts src/transport/extension/__tests__/ExtensionTransport.test.ts
git commit -m "feat: add WalletTransport interface + ExtensionTransport"
```

---

## Task 5: Extract MobileTransport (WalletConnect)

**Files:**
- Create: `src/transport/MobileTransport.ts`
- Test: `src/transport/__tests__/MobileTransport.test.ts`
- (Modify `src/PeraWalletConnect.ts` happens in Task 7, not here.)

**Interfaces:**
- Consumes: `WalletConnect` from `@perawallet/walletconnect`, `getPeraConnectConfig`, modal utils, models.
- Produces: `class MobileTransport implements WalletTransport` with `constructor(deps: MobileTransportDeps)` where `MobileTransportDeps = { connector: WalletConnect | null; shouldShowSignTxnToast: boolean; isInWebview: boolean; getSilent: () => Promise<boolean> }`; exposes `setConnector(c: WalletConnect | null)` and `getConnector(): WalletConnect | null`.

This task **moves** the mobile signing logic out of `PeraWalletConnect.ts` (current `signTransactionWithMobile` lines 364-403, `signDataWithMobile` 421-470, `signArc60Data` body 651-751) into a dedicated class. `connect()`/`reconnect()` for mobile remain orchestrated by `PeraWalletConnect` (they own the WalletConnect session + modal), so `MobileTransport.connect/reconnect` delegate through injected callbacks (wired in Task 7). This keeps the WalletConnect lifecycle in one place while isolating the sign paths.

- [ ] **Step 1: Write the failing test**

Create `src/transport/__tests__/MobileTransport.test.ts`:

```ts
import {describe, it, expect, vi} from "vitest";
import {MobileTransport} from "../MobileTransport";

function makeConnector(response: unknown) {
  return {
    sendCustomRequest: vi.fn().mockResolvedValue(response),
    accounts: ["ADDR"]
  } as any;
}

function makeTransport(connector: any) {
  return new MobileTransport({
    connector,
    shouldShowSignTxnToast: false,
    isInWebview: false,
    getSilent: async () => true
  });
}

describe("MobileTransport", () => {
  it("signTransaction decodes base64 responses and drops nulls", async () => {
    const b64 = Buffer.from([4, 5]).toString("base64");
    const transport = makeTransport(makeConnector([b64, null]));

    const signed = await transport.signTransaction([{txn: "AA=="}]);

    expect(signed).toHaveLength(1);
    expect(Array.from(signed[0])).toEqual([4, 5]);
  });

  it("signTransaction decodes number[][] responses", async () => {
    const transport = makeTransport(makeConnector([[7, 8]]));

    const signed = await transport.signTransaction([{txn: "AA=="}]);

    expect(Array.from(signed[0])).toEqual([7, 8]);
  });

  it("throws when the connector is missing", async () => {
    const transport = makeTransport(null);

    await expect(transport.signTransaction([{txn: "AA=="}])).rejects.toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/transport/__tests__/MobileTransport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement MobileTransport by moving the mobile code**

Create `src/transport/MobileTransport.ts`. The `signTransaction`, `signData`, and `signArc60Data` bodies are moved **verbatim** from `PeraWalletConnect.ts` (lines 364-403, 421-470, 683-751 respectively), with `this.connector!` → `this.connector`, config `silent` obtained via the injected `getSilent()`, and the redirect-modal/toast side effects retained:

```ts
import algosdk from "algosdk";

import {WalletTransport, ConnectOptions} from "./WalletTransport";
import PeraWalletConnectError from "../util/PeraWalletConnectError";
import {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  PeraWalletTransaction
} from "../util/model/peraWalletModels";
import {AlgorandChainIDs} from "../util/peraWalletTypes";
import {base64ToUint8Array, formatJsonRpcRequest} from "../util/transaction/transactionUtils";
import {
  removeModalWrapperFromDOM,
  PERA_WALLET_REDIRECT_MODAL_ID,
  PERA_WALLET_SIGN_TXN_TOAST_ID
} from "../modal/peraWalletConnectModalUtils";

// WalletConnect type is intentionally loose to avoid coupling the transport to
// the connector's full type surface.
type Connector = {
  sendCustomRequest: (request: unknown, options?: unknown) => Promise<any>;
  accounts?: string[];
} | null;

export interface MobileTransportDeps {
  connector: Connector;
  shouldShowSignTxnToast: boolean;
  isInWebview: boolean;
  getSilent: () => Promise<boolean>;
  // connect/reconnect are owned by the orchestrator (WalletConnect session +
  // modal lifecycle); injected so MobileTransport satisfies WalletTransport.
  connectImpl?: (opts?: ConnectOptions) => Promise<string[]>;
  reconnectImpl?: () => Promise<string[]>;
  disconnectImpl?: () => Promise<void>;
}

export class MobileTransport implements WalletTransport {
  readonly platform = "mobile" as const;
  private deps: MobileTransportDeps;

  constructor(deps: MobileTransportDeps) {
    this.deps = deps;
  }

  private get connector(): Connector {
    return this.deps.connector;
  }

  setConnector(connector: Connector) {
    this.deps.connector = connector;
  }

  connect(opts?: ConnectOptions): Promise<string[]> {
    if (!this.deps.connectImpl) {
      return Promise.reject(new Error("MobileTransport.connect not wired"));
    }

    return this.deps.connectImpl(opts);
  }

  reconnect(): Promise<string[]> {
    if (!this.deps.reconnectImpl) {
      return Promise.reject(new Error("MobileTransport.reconnect not wired"));
    }

    return this.deps.reconnectImpl();
  }

  disconnect(): Promise<void> {
    return this.deps.disconnectImpl ? this.deps.disconnectImpl() : Promise.resolve();
  }

  async signTransaction(
    signTxnRequestParams: PeraWalletTransaction[]
  ): Promise<Uint8Array[]> {
    if (!this.connector) {
      throw new Error("PeraWalletConnect was not initialized correctly.");
    }

    const formattedSignTxnRequest = formatJsonRpcRequest("algo_signTxn", [
      signTxnRequestParams
    ]);

    try {
      const silent = await this.deps.getSilent();
      const response = await this.connector.sendCustomRequest(formattedSignTxnRequest, {
        forcePushNotification: !silent
      });
      const nonNullResponse = response.filter(Boolean) as (string | number[])[];

      return typeof nonNullResponse[0] === "string"
        ? (nonNullResponse as string[]).map(base64ToUint8Array)
        : (nonNullResponse as number[][]).map((item) => Uint8Array.from(item));
    } catch (error: any) {
      return Promise.reject(
        new PeraWalletConnectError(
          {type: "SIGN_TRANSACTIONS", detail: error},
          error.message || "Failed to sign transaction"
        )
      );
    } finally {
      removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
      removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);
    }
  }

  async signData(
    data: PeraWalletArbitraryData[],
    signer: string,
    chainId: AlgorandChainIDs
  ): Promise<Uint8Array[]> {
    if (!this.connector) {
      throw new Error("PeraWalletConnect was not initialized correctly.");
    }

    const b64encodedData = data.map((item) => ({
      data: Buffer.from(item.data).toString("base64"),
      message: item.message
    }));
    const formattedSignTxnRequest = formatJsonRpcRequest(
      "algo_signData",
      b64encodedData.map((item) => ({...item, signer, chainId}))
    );

    try {
      const silent = await this.deps.getSilent();
      const response = await this.connector.sendCustomRequest(formattedSignTxnRequest, {
        forcePushNotification: !silent
      });

      return typeof response[0] === "string"
        ? (response as string[]).map(base64ToUint8Array)
        : (response as number[][]).map((item) => Uint8Array.from(item));
    } catch (error: any) {
      return Promise.reject(
        new PeraWalletConnectError(
          {type: "SIGN_TRANSACTIONS", detail: error},
          error.message || "Failed to sign transaction"
        )
      );
    } finally {
      removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
      removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);
    }
  }

  async signArc60Data(
    payload: PeraWalletArc60SignData
  ): Promise<PeraWalletArc60SignDataResponse> {
    if (!this.connector) {
      throw new Error("PeraWalletConnect was not initialized correctly.");
    }

    const dataBase64 = Buffer.from(payload.data).toString("base64");
    const wireParams: Record<string, unknown> = {
      data: dataBase64,
      signer: payload.signer,
      domain: payload.domain,
      authenticatorData: Buffer.from(payload.authenticatorData).toString("base64"),
      metadata: payload.metadata
    };

    if (payload.requestId !== undefined) wireParams.requestId = payload.requestId;
    if (payload.hdPath !== undefined) wireParams.hdPath = payload.hdPath;

    const request = formatJsonRpcRequest("algo_signData", wireParams);

    try {
      const silent = await this.deps.getSilent();
      const response = await this.connector.sendCustomRequest(request as any, {
        forcePushNotification: !silent
      });
      const responseArray = Array.isArray(response) ? response : [response];
      const first = responseArray.filter(Boolean)[0];

      if (!first) {
        throw new Error("No signature returned from wallet.");
      }

      const signature =
        typeof first === "string"
          ? base64ToUint8Array(first)
          : Uint8Array.from(first as number[]);

      return {
        data: dataBase64,
        signer: algosdk.decodeAddress(payload.signer).publicKey,
        domain: payload.domain,
        authenticatorData: payload.authenticatorData,
        ...(payload.requestId !== undefined && {requestId: payload.requestId}),
        ...(payload.hdPath !== undefined && {hdPath: payload.hdPath}),
        signature
      };
    } catch (error) {
      return Promise.reject(
        new PeraWalletConnectError(
          {type: "SIGN_TRANSACTIONS", detail: error},
          (error as Error)?.message || "Failed to sign ARC-60 data"
        )
      );
    } finally {
      removeModalWrapperFromDOM(PERA_WALLET_REDIRECT_MODAL_ID);
      removeModalWrapperFromDOM(PERA_WALLET_SIGN_TXN_TOAST_ID);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/transport/__tests__/MobileTransport.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/transport/MobileTransport.ts src/transport/__tests__/MobileTransport.test.ts
git commit -m "feat: extract MobileTransport from PeraWalletConnect"
```

---

## Task 6: Extract WebTransport (Pera Web / Teller)

**Files:**
- Create: `src/transport/WebTransport.ts`
- Test: `src/transport/__tests__/WebTransport.test.ts`

**Interfaces:**
- Consumes: `runWebSignTransactionFlow` (`src/util/sign/signTransactionFlow.ts`), `getPeraConnectConfig`, models.
- Produces: `class WebTransport implements WalletTransport` with `constructor(deps: {getWebWalletURL: () => Promise<string>; connectImpl?: (opts?: ConnectOptions) => Promise<string[]>; reconnectImpl?: () => Promise<string[]>})`.

`connect()`/`reconnect()` for web are owned by the orchestrator (they set `window.onWebWalletConnect` and read config); they are injected. `signTransaction`/`signData` move here (from `PeraWalletConnect.signTransactionWithWeb` lines 405-419 and `signDataWithWeb` 472-495). `signArc60Data` throws, preserving today's behavior.

- [ ] **Step 1: Write the failing test**

Create `src/transport/__tests__/WebTransport.test.ts`:

```ts
import {describe, it, expect, vi} from "vitest";

const runWebSignTransactionFlow = vi.fn();

vi.mock("../../util/sign/signTransactionFlow", () => ({
  runWebSignTransactionFlow: (args: any) => {
    runWebSignTransactionFlow(args);
    args.resolve([new Uint8Array([1])]);
  }
}));

// Import AFTER the mock is registered.
const {WebTransport} = await import("../WebTransport");

describe("WebTransport", () => {
  it("signTransaction delegates to runWebSignTransactionFlow with SIGN_TXN", async () => {
    const transport = new WebTransport({
      getWebWalletURL: async () => "https://web.perawallet.app"
    });

    const signed = await transport.signTransaction([{txn: "AA=="}]);

    expect(signed).toHaveLength(1);
    expect(runWebSignTransactionFlow).toHaveBeenCalledWith(
      expect.objectContaining({method: "SIGN_TXN", webWalletURL: "https://web.perawallet.app"})
    );
  });

  it("signArc60Data throws (web is unsupported)", async () => {
    const transport = new WebTransport({
      getWebWalletURL: async () => "https://web.perawallet.app"
    });

    await expect(
      transport.signArc60Data({} as any)
    ).rejects.toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/transport/__tests__/WebTransport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement WebTransport**

Create `src/transport/WebTransport.ts`:

```ts
import {WalletTransport, ConnectOptions} from "./WalletTransport";
import {
  PeraWalletArbitraryData,
  PeraWalletArc60SignData,
  PeraWalletArc60SignDataResponse,
  PeraWalletTransaction
} from "../util/model/peraWalletModels";
import {AlgorandChainIDs} from "../util/peraWalletTypes";
import {runWebSignTransactionFlow} from "../util/sign/signTransactionFlow";

export interface WebTransportDeps {
  getWebWalletURL: () => Promise<string>;
  connectImpl?: (opts?: ConnectOptions) => Promise<string[]>;
  reconnectImpl?: () => Promise<string[]>;
  disconnectImpl?: () => Promise<void>;
}

export class WebTransport implements WalletTransport {
  readonly platform = "web" as const;
  private deps: WebTransportDeps;

  constructor(deps: WebTransportDeps) {
    this.deps = deps;
  }

  connect(opts?: ConnectOptions): Promise<string[]> {
    if (!this.deps.connectImpl) {
      return Promise.reject(new Error("WebTransport.connect not wired"));
    }

    return this.deps.connectImpl(opts);
  }

  reconnect(): Promise<string[]> {
    if (!this.deps.reconnectImpl) {
      return Promise.reject(new Error("WebTransport.reconnect not wired"));
    }

    return this.deps.reconnectImpl();
  }

  disconnect(): Promise<void> {
    return this.deps.disconnectImpl ? this.deps.disconnectImpl() : Promise.resolve();
  }

  async signTransaction(
    signTxnRequestParams: PeraWalletTransaction[]
  ): Promise<Uint8Array[]> {
    const webWalletURL = await this.deps.getWebWalletURL();

    return new Promise<Uint8Array[]>((resolve, reject) =>
      runWebSignTransactionFlow({
        signTxnRequestParams,
        webWalletURL,
        method: "SIGN_TXN",
        resolve,
        reject
      })
    );
  }

  async signData(
    data: PeraWalletArbitraryData[],
    signer: string,
    chainId: AlgorandChainIDs
  ): Promise<Uint8Array[]> {
    const webWalletURL = await this.deps.getWebWalletURL();

    return new Promise<Uint8Array[]>((resolve, reject) =>
      runWebSignTransactionFlow({
        method: "SIGN_DATA",
        signTxnRequestParams: data,
        signer,
        chainId,
        webWalletURL,
        resolve,
        reject
      })
    );
  }

  signArc60Data(_payload: PeraWalletArc60SignData): Promise<PeraWalletArc60SignDataResponse> {
    return Promise.reject(
      new Error("ARC-60 signing is currently only supported via the Pera mobile wallet or the Pera extension.")
    );
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/transport/__tests__/WebTransport.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/transport/WebTransport.ts src/transport/__tests__/WebTransport.test.ts
git commit -m "feat: extract WebTransport from PeraWalletConnect"
```

---

## Task 7: Rewire PeraWalletConnect as orchestrator

**Files:**
- Modify: `src/PeraWalletConnect.ts` (constructor, `connect`, `reconnectSession`, `disconnect`, `signTransaction`, `signData`, `signArc60Data`)
- Test: `src/__tests__/PeraWalletConnect.orchestration.test.ts`

**Interfaces:**
- Consumes: `MobileTransport`, `WebTransport`, `ExtensionTransport`, `Arc0027Client` (Tasks 2,4,5,6).
- Produces: `PeraWalletConnect` with new option `shouldPreferExtension?: boolean` (default `true`), new method `isExtensionAvailable(): Promise<boolean>`, and delegation of `signTransaction`/`signData`/`signArc60Data` to the active transport based on `this.platform`.

**Behavior to preserve:** all existing method signatures; mobile redirect-modal/toast side effects in `signTransaction`/`signData` (moved from PeraWalletConnect into MobileTransport are the sign calls, but the *modal-open* side effects stay in the orchestrator's `signTransaction`/`signData` since they depend on `isMobile()`/`isInWebview`, exactly as lines 537-549 today).

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/PeraWalletConnect.orchestration.test.ts`:

```ts
import {describe, it, expect, vi, afterEach} from "vitest";
import PeraWalletConnect from "../PeraWalletConnect";
import {
  saveWalletDetailsToStorage,
  resetWalletDetailsFromStorage
} from "../util/storage/storageUtils";

vi.mock("../util/api/peraWalletConnectApi", () => ({
  getPeraConnectConfig: async () => ({
    isWebWalletAvailable: false,
    bridgeURL: "https://bridge.test",
    webWalletURL: "https://web.test",
    shouldDisplayNewBadge: false,
    shouldUseSound: false,
    silent: true,
    promoteMobile: false
  })
}));

describe("PeraWalletConnect orchestration", () => {
  afterEach(() => {
    resetWalletDetailsFromStorage();
    vi.restoreAllMocks();
  });

  it("routes signTransaction to the extension transport when platform is extension", async () => {
    saveWalletDetailsToStorage(["ADDR"], "pera-wallet-extension");

    const pera = new PeraWalletConnect();
    const spy = vi
      .spyOn((pera as any).extensionTransport, "signTransaction")
      .mockResolvedValue([new Uint8Array([1])]);

    await pera.signTransaction([[]]);

    expect(spy).toHaveBeenCalled();
  });

  it("isExtensionAvailable resolves false when nothing answers discover", async () => {
    const pera = new PeraWalletConnect();

    await expect(pera.isExtensionAvailable()).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/PeraWalletConnect.orchestration.test.ts`
Expected: FAIL — `extensionTransport` undefined / `isExtensionAvailable` not a function.

- [ ] **Step 3: Add fields, options, and transport instances**

In `src/PeraWalletConnect.ts`:

Add imports near the top (after line 48):

```ts
import {ExtensionTransport} from "./transport/extension/ExtensionTransport";
import {MobileTransport} from "./transport/MobileTransport";
import {WebTransport} from "./transport/WebTransport";
import {Arc0027Client} from "./transport/extension/arc0027Client";
```

Extend `PeraWalletConnectOptions` (line 50-56):

```ts
interface PeraWalletConnectOptions {
  bridge?: string;
  shouldShowSignTxnToast?: boolean;
  chainId?: AlgorandChainIDs;
  compactMode?: boolean;
  singleAccount?: boolean;
  shouldPreferExtension?: boolean;
}
```

Add class fields (after line 93):

```ts
  shouldPreferExtension: boolean;
  private arc0027Client: Arc0027Client;
  private extensionTransport: ExtensionTransport;
```

In the constructor (after line 108, `this.algodClients = new Map();`):

```ts
    this.shouldPreferExtension =
      typeof options?.shouldPreferExtension === "undefined"
        ? true
        : options.shouldPreferExtension;
    this.arc0027Client = new Arc0027Client();
    this.extensionTransport = new ExtensionTransport(this.arc0027Client);
```

- [ ] **Step 4: Add isExtensionAvailable + update isConnected**

Add method (after the `platform` getter, ~line 118):

```ts
  isExtensionAvailable(): Promise<boolean> {
    return this.arc0027Client.discover().then((info) => info !== null);
  }
```

Extend `isConnected` (line 120-128) with an extension branch:

```ts
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
```

- [ ] **Step 5: Run discover before createSession in connect()**

In `connect()`, before `this.connector = new WalletConnect({...})` (line 191), add extension detection and a resolve bridge, and pass extension info into the modal config:

```ts
        // Auto-detect the ARC-0027 browser extension before opening the modal.
        const discovered = this.shouldPreferExtension
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
```

Then extend `generatePeraWalletConnectModalActions(...)` call (line 193-202) to pass:

```ts
            isExtensionAvailable: !!discovered,
            extensionName: discovered?.name || "Pera Extension",
```

(These are added to `PeraWalletModalConfig` in Task 8.)

- [ ] **Step 6: Delegate signTransaction / signData / signArc60Data**

Replace the tail of `signTransaction` (lines 558-566) so the web/extension/mobile choice goes through transports. Keep the mobile modal side effects (lines 537-549) as-is. New tail:

```ts
    if (this.platform === "web") {
      const {webWalletURL} = await getPeraConnectConfig();

      return new WebTransport({getWebWalletURL: async () => webWalletURL}).signTransaction(
        signTxnRequestParams
      );
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
```

In `signData` (lines 593-611), add an extension branch before the web branch:

```ts
    if (this.platform === "extension") {
      signatures = await this.extensionTransport.signData(data, signer, chainId);
    } else if (this.platform === "web") {
```

(Convert the existing `if (this.platform === "web")` to `else if`, and the final `else` mobile branch delegates to `new MobileTransport({...}).signData(data, signer, chainId)`.)

In `signArc60Data` (line 655), broaden the platform guard to allow extension:

```ts
    if (this.platform !== "mobile" && this.platform !== "extension") {
      throw new Error(
        "ARC-60 signing is only supported via the Pera mobile wallet or the Pera extension."
      );
    }

    if (this.platform === "extension") {
      const response = await this.extensionTransport.signArc60Data(payload, verifySignature);

      if (verifySignature) {
        const ok = await this.verifyArc60Signature(
          payload.data,
          payload.authenticatorData,
          response.signature,
          payload.signer
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
```

(Leave the existing mobile ARC-60 body below unchanged.)

- [ ] **Step 7: Add extension branches to reconnectSession and disconnect**

In `reconnectSession` (after the `pera-wallet-web` branch, ~line 275), add:

```ts
        if (walletDetails?.type === "pera-wallet-extension") {
          const accounts = await this.extensionTransport.reconnect();

          // reconnect() returns [] but leaves storage intact when the
          // extension is still present; fall back to stored accounts.
          resolve(accounts.length ? accounts : walletDetails.accounts || []);

          return;
        }
```

In `disconnect` (line 315-327), add before `resetWalletDetailsFromStorage()`:

```ts
    if (this.isConnected && this.platform === "extension") {
      await this.extensionTransport.disconnect();
    }
```

- [ ] **Step 8: Run tests**

Run: `pnpm test -- src/__tests__/PeraWalletConnect.orchestration.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Run the full suite + lint**

Run: `pnpm test && pnpm run eslint`
Expected: all tests PASS, no lint errors.

- [ ] **Step 10: Commit**

```bash
git add src/PeraWalletConnect.ts src/__tests__/PeraWalletConnect.orchestration.test.ts
git commit -m "feat: route PeraWalletConnect through transports + extension detection"
```

---

## Task 8: Modal — pre-selected extension accordion item

**Files:**
- Modify: `src/modal/peraWalletConnectModalUtils.ts:7-16,62-89`
- Modify: `src/modal/mode/desktop/PeraWalletConnectModalDesktopMode.ts:24-114,175-218,231-262`
- Modify: `src/PeraWalletConnect.ts` (the `generatePeraWalletConnectModalActions` local fn, lines 58-81)
- Test: `src/modal/mode/desktop/__tests__/extensionOption.test.ts`

**Interfaces:**
- Consumes: `PeraWalletModalConfig` (extended here).
- Produces: `PeraWalletModalConfig` gains `isExtensionAvailable?: boolean` and `extensionName?: string`; the desktop web component renders `#extension-wallet-option` (pre-expanded, `--active`) when `is-extension-available="true"`, wired to `window.onExtensionConnect`.

- [ ] **Step 1: Write the failing test**

Create `src/modal/mode/desktop/__tests__/extensionOption.test.ts`:

```ts
import {describe, it, expect, beforeAll, vi} from "vitest";
import "../PeraWalletConnectModalDesktopMode";

// The custom element self-registers on import via App.ts in production; here we
// register it directly if not already defined.
import {PeraWalletModalDesktopMode} from "../PeraWalletConnectModalDesktopMode";

beforeAll(() => {
  if (!customElements.get("pera-wallet-modal-desktop-mode")) {
    customElements.define("pera-wallet-modal-desktop-mode", PeraWalletModalDesktopMode);
  }
});

describe("desktop modal extension option", () => {
  it("renders the extension accordion item when is-extension-available is true", () => {
    const el = document.createElement("pera-wallet-modal-desktop-mode");
    el.setAttribute("is-extension-available", "true");
    el.setAttribute("extension-name", "Pera Extension");
    el.setAttribute("uri", "wc:test");
    document.body.appendChild(el);

    const option = el.shadowRoot?.getElementById("extension-wallet-option");

    expect(option).toBeTruthy();
  });

  it("does not render the extension item when unavailable", () => {
    const el = document.createElement("pera-wallet-modal-desktop-mode");
    el.setAttribute("uri", "wc:test");
    document.body.appendChild(el);

    expect(el.shadowRoot?.getElementById("extension-wallet-option")).toBeFalsy();
  });

  it("invokes window.onExtensionConnect when the extension button is clicked", () => {
    // @ts-ignore
    window.onExtensionConnect = vi.fn();
    const el = document.createElement("pera-wallet-modal-desktop-mode");
    el.setAttribute("is-extension-available", "true");
    el.setAttribute("uri", "wc:test");
    document.body.appendChild(el);

    const button = el.shadowRoot?.getElementById(
      "pera-wallet-connect-extension-launch-button"
    ) as HTMLButtonElement;
    button?.click();

    // @ts-ignore
    expect(window.onExtensionConnect).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/modal/mode/desktop/__tests__/extensionOption.test.ts`
Expected: FAIL — no `#extension-wallet-option` element.

- [ ] **Step 3: Extend PeraWalletModalConfig**

In `src/modal/peraWalletConnectModalUtils.ts`, add to `PeraWalletModalConfig` (after line 15):

```ts
  isExtensionAvailable?: boolean;
  extensionName?: string;
```

In `openPeraWalletConnectModal` (line 62-89), destructure the two new fields and add them as attributes on the rendered element:

```ts
      isExtensionAvailable,
      extensionName
```

and append to the `root.innerHTML` element attributes (inside the `<pera-wallet-connect-modal ...>` tag, line 86):

```ts
 is-extension-available="${isExtensionAvailable || false}" extension-name="${extensionName || ""}"
```

- [ ] **Step 4: Thread attributes through PeraWalletConnectModal**

`PeraWalletConnectModal` forwards attributes to the desktop-mode element. Open `src/modal/PeraWalletConnectModal.ts`, find where it constructs `<pera-wallet-modal-desktop-mode ...>`, and add the two attributes (mirroring how `uri`/`compact-mode` are passed). Add:

```ts
 is-extension-available="${this.getAttribute("is-extension-available")}" extension-name="${this.getAttribute("extension-name")}"
```

- [ ] **Step 5: Render the extension accordion item**

In `src/modal/mode/desktop/PeraWalletConnectModalDesktopMode.ts`, extend `getConnectOptions` (line 24) to also build an extension option. Add before the `return` (line 108):

```ts
  const extensionWalletOption = `
  <div id="extension-wallet-option" class="pera-wallet-accordion-item pera-wallet-accordion-item--active">
            <a class="pera-wallet-accordion-toggle">
              <button class="pera-wallet-accordion-toggle__button"></button>
              <img src="${ArrowRight}" class="pera-wallet-accordion-icon" />
              <div class="pera-wallet-accordion-toggle__text">
                Connect with
                <span class="pera-wallet-accordion-toggle__bold-color">Pera Extension</span>
              </div>
            </a>
            <div class="pera-wallet-accordion-item__content">
              <p class="pera-wallet-connect-modal-desktop-mode__web-wallet__description">
                Pera Extension detected in your browser
              </p>
              <button
                id="pera-wallet-connect-extension-launch-button"
                class="pera-wallet-connect-modal-desktop-mode__web-wallet__launch-button">
                Connect with Extension
                <img src="${ChevronRightIcon}" />
              </button>
            </div>
          </div>`;
```

and return it:

```ts
  return {
    mobileWalletOption: document.createRange().createContextualFragment(mobileWalletOption),
    webWalletOption: document.createRange().createContextualFragment(webWalletOption),
    extensionWalletOption: document
      .createRange()
      .createContextualFragment(extensionWalletOption)
  };
```

- [ ] **Step 6: Insert the extension item first when available**

In the constructor (lines 206-216), when the extension is available, prepend it and de-activate the others. Replace the `if (shouldPromoteMobile) { ... } else { ... }` block with:

```ts
      const isExtensionAvailable =
        this.getAttribute("is-extension-available") === "true";
      const {webWalletOption, mobileWalletOption, extensionWalletOption} =
        getConnectOptions(shouldPromoteMobile);

      if (isExtensionAvailable) {
        // Extension is the pre-selected (active) option; make the others
        // inactive so only one accordion item is expanded.
        webWalletOption
          .querySelector(".pera-wallet-accordion-item")
          ?.classList.remove("pera-wallet-accordion-item--active");
        mobileWalletOption
          .querySelector(".pera-wallet-accordion-item")
          ?.classList.remove("pera-wallet-accordion-item--active");
        desktopModeDefaultView?.appendChild(extensionWalletOption);
        desktopModeDefaultView?.appendChild(webWalletOption);
        desktopModeDefaultView?.appendChild(mobileWalletOption);
      } else if (shouldPromoteMobile) {
        desktopModeDefaultView?.appendChild(mobileWalletOption);
        desktopModeDefaultView?.appendChild(webWalletOption);
      } else {
        desktopModeDefaultView?.appendChild(webWalletOption);
        desktopModeDefaultView?.appendChild(mobileWalletOption);
      }
```

- [ ] **Step 7: Wire the extension button click**

In `handleChangeView` (line 231-262), add after the `webWalletLaunchButton` block (line 258):

```ts
    const extensionLaunchButton = this.shadowRoot?.getElementById(
      "pera-wallet-connect-extension-launch-button"
    );

    if (extensionLaunchButton) {
      extensionLaunchButton.addEventListener("click", () => {
        // @ts-ignore ts-2339 — set by PeraWalletConnect.connect()
        if (typeof window.onExtensionConnect === "function") {
          // @ts-ignore
          window.onExtensionConnect();
        }
      });
    }
```

- [ ] **Step 8: Run tests**

Run: `pnpm test -- src/modal/mode/desktop/__tests__/extensionOption.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add src/modal/peraWalletConnectModalUtils.ts src/modal/PeraWalletConnectModal.ts src/modal/mode/desktop/PeraWalletConnectModalDesktopMode.ts src/modal/mode/desktop/__tests__/extensionOption.test.ts
git commit -m "feat: render pre-selected Pera extension option in connect modal"
```

---

## Task 9: Public exports, docs & full verification

**Files:**
- Modify: `src/index.ts:16-26`
- Modify: `README.md` (add an "Extension detection" note)
- Create: `docs/superpowers/plans/arc0027-cross-repo-contract.md` (the shared ARC-60 fixture note from spec §11)

**Interfaces:**
- Produces: no new runtime exports required (all new types are internal); `README` documents `shouldPreferExtension`, `isExtensionAvailable()`, and the ARC-60 origin-binding behavior.

- [ ] **Step 1: Document the ARC-60 origin-binding behavior in JSDoc**

In `src/PeraWalletConnect.ts`, above `signArc60Data` (line 651), append to the existing doc comment:

```ts
   * On the Pera **extension** transport, `payload.domain` MUST match the
   * dApp's page origin (SIWA origin binding). Connect pre-validates this and
   * throws `SIGN_DATA_NETWORK_MISMATCH` before contacting the extension; the
   * extension independently enforces the same rule. The mobile wallet does not
   * enforce origin binding (the peer URL is self-asserted).
```

- [ ] **Step 2: Add README section**

Append to `README.md`:

```markdown
## Browser extension (ARC-0027)

When a compatible Pera browser extension is installed, `connect()` auto-detects
it (via an ARC-0027 `discover` round-trip) and pre-selects "Connect with Pera
Extension" in the connect modal. Users can still fall back to the QR / Pera Web
options in the same modal.

- Disable auto-detection with `new PeraWalletConnect({shouldPreferExtension: false})`.
- Check availability yourself with `await peraWallet.isExtensionAvailable()`.
- `signArc60Data` is supported on the extension; on that path `domain` must match
  your page origin. Legacy `signData` (arbitrary data) is not yet supported on the
  extension and throws `EXTENSION_UNSUPPORTED_OPERATION`.
```

- [ ] **Step 3: Write the cross-repo contract note**

Create `docs/superpowers/plans/arc0027-cross-repo-contract.md`:

```markdown
# ARC-0027 cross-repo contract checklist

Shared expectations between `@perawallet/connect` and the Pera browser
extension. Keep in sync to prevent drift.

- **ARC-60 sign_message**: request `params` must satisfy the extension's
  `arc60WireSchema` (`packages/signing/src/utils/arc60-wire.ts`): `data`,
  `signer`, `domain`, `authenticatorData` (base64/string), optional
  `requestId`/`hdPath`, `metadata: {scope:number, encoding:string}`. Response:
  `{providerId, signature}` where `signature` is base64 and verifies as
  `ed25519(sha256(data) ‖ sha256(authenticatorData))`.
- **discover response icon field**: confirm `icon` vs `iconUrl`. Connect
  tolerates both (`DiscoverResult`); the extension should settle on one.
- **Shared fixture** (TODO with extension team): a canonical SIWA request +
  expected signature, asserted by Connect's `verifyArc60Signature` and the
  extension's signing pipeline test.
```

- [ ] **Step 4: Run the full suite, lint, and build**

Run: `pnpm test && pnpm run eslint && pnpm run build:release`
Expected: all tests PASS, no lint errors, build succeeds and emits `dist/`.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts src/PeraWalletConnect.ts README.md docs/superpowers/plans/arc0027-cross-repo-contract.md
git commit -m "docs: document extension transport + cross-repo ARC-0027 contract"
```

---

## Self-Review (completed against spec)

**Spec coverage:**
- §2 transport abstraction → Tasks 4-7. §3 ExtensionTransport / arc0027Client → Tasks 2,4. §4 ARC-60 no new schema (reuse wire shape) → Task 4 step 4 + Task 9 contract note. §5 modal pre-selection → Task 8. §6 storage/types → Task 1. §7 public API (`isExtensionAvailable`, `shouldPreferExtension`) → Task 7. §8 lifecycle (connect/reconnect/disconnect) → Task 7. §9 testing → tests in every task. §11 cross-repo → Task 9. signData fail-fast → Task 4. origin-binding pre-validate → Tasks 3,4.
- **Deviation from spec §7 (documented):** modal-open is NOT decoupled from WalletConnect; instead `discover()` runs before `createSession()` and extension info is threaded through the existing `qrcodeModal` config. Same UX, lower risk. Approved implicitly via "proceed"; flagged here for the reviewer.

**Placeholder scan:** No "TBD/TODO" in executable steps. The one `TODO` is inside the cross-repo *contract doc* (an intentional coordination item owned jointly with the extension team), not a code step.

**Type consistency:** `WalletTransport` method names (`connect`/`reconnect`/`disconnect`/`signTransaction`/`signData`/`signArc60Data`) are identical across Tasks 4-7. `saveWalletDetailsToStorage(accounts, "pera-wallet-extension")` matches the Task 1 signature. `Arc0027Client.request(method, params, timeoutMs?)` and `.discover(timeoutMs?)` are used consistently in Tasks 2,4,7. `PeraWalletModalConfig.isExtensionAvailable`/`extensionName` consistent across Tasks 7,8.
