import {describe, it, expect} from "vitest";

import PeraWalletConnect from "../PeraWalletConnect";
import PeraWalletConnectError from "../util/PeraWalletConnectError";

/**
 * Guards the v1 public surface against accidental breakage. Every call below
 * is how a dApp written before `window.pera` support calls the SDK; a change
 * that stops any of it from compiling or resolving is a breaking change and
 * needs a major version, not a patch.
 */
describe("public API compatibility", () => {
  it("still accepts the experimental option", () => {
    const pera = new PeraWalletConnect({experimental: true});

    // It no longer gates anything; extension support keys off window.pera.
    expect(pera.experimental).toBe(true);
  });

  it("still resolves isExtensionAvailable() as a promise", async () => {
    const result = new PeraWalletConnect().isExtensionAvailable();

    expect(typeof result.then).toBe("function");
    await expect(result).resolves.toBe(false);
  });

  it("still accepts EXTENSION_UNSUPPORTED_OPERATION as an error type", () => {
    const error = new PeraWalletConnectError(
      {type: "EXTENSION_UNSUPPORTED_OPERATION"},
      "unsupported"
    );

    expect(error.data.type).toBe("EXTENSION_UNSUPPORTED_OPERATION");
  });
});
