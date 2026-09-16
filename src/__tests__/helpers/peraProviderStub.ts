import {vi} from "vitest";

import {PeraProvider} from "../../transport/extension/peraProviderTypes";

export type PeraProviderStub = PeraProvider & {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  getAddresses: ReturnType<typeof vi.fn>;
  signTransactions: ReturnType<typeof vi.fn>;
  signData: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  /** Fire a wallet-initiated notification at every subscribed handler. */
  emit: (event: string, params?: unknown) => void;
};

export function makePeraProviderError(code: number, message = "provider error") {
  const error = new Error(message) as Error & {code: number};

  error.name = "PeraProviderError";
  error.code = code;

  return error;
}

/**
 * A `window.pera` double with the v1 shape. `connect()` resolves with one
 * testnet account by default; override per test with `mockResolvedValue`.
 */
export function makePeraProviderStub(accounts = ["EXT_ADDR"]): PeraProviderStub {
  const handlers: Record<string, ((params: unknown) => void)[]> = {};

  return {
    version: "1",
    connect: vi.fn().mockResolvedValue({
      accounts: accounts.map((address) => ({address, name: address})),
      network: "testnet"
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getAddresses: vi.fn().mockResolvedValue([]),
    signTransactions: vi.fn(),
    signData: vi.fn(),
    on: vi.fn((event: string, handler: (params: unknown) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);

      return () => {
        handlers[event] = handlers[event].filter((item) => item !== handler);
      };
    }),
    emit: (event: string, params?: unknown) => {
      (handlers[event] || []).forEach((handler) => handler(params));
    }
  } as PeraProviderStub;
}

/** Installs the stub at `window.pera`; call before `new PeraWalletConnect()`. */
export function installPeraProvider(accounts?: string[]) {
  const provider = makePeraProviderStub(accounts);

  Object.defineProperty(window, "pera", {
    value: provider,
    configurable: true,
    writable: true
  });

  return provider;
}

export function uninstallPeraProvider() {
  delete (window as {pera?: unknown}).pera;
}
