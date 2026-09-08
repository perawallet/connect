import {describe, it, expect, vi, afterEach} from "vitest";
import algosdk from "algosdk";

import PeraWalletConnect from "../PeraWalletConnect";

vi.mock("../util/api/peraWalletConnectApi", () => ({
  getPeraConnectConfig: () =>
    Promise.resolve({
      isWebWalletAvailable: false,
      bridgeURL: "https://bridge.test",
      webWalletURL: "https://web.test",
      shouldDisplayNewBadge: false,
      shouldUseSound: false,
      silent: true,
      promoteMobile: false
    })
}));

const account = algosdk.generateAccount();
const authAccount = algosdk.generateAccount();

/**
 * Stubs the per-network algod client so `accountInformation(...).exclude(...).do()`
 * resolves with the given `authAddr` (or rejects with `failure`). Returns the
 * spies so tests can assert which network was consulted and how.
 */
function mockAccountInformation(
  pera: PeraWalletConnect,
  options: {authAddr?: string; failure?: Error}
) {
  const exclude = vi.fn().mockReturnThis();
  const accountInformation = vi.fn().mockReturnValue({
    exclude,
    do: () =>
      options.failure
        ? Promise.reject(options.failure)
        : Promise.resolve({
            authAddr: options.authAddr
              ? algosdk.Address.fromString(options.authAddr)
              : undefined
          })
  });

  const getAlgodClient = vi
    .spyOn(pera as any, "getAlgodClient")
    .mockReturnValue({client: {accountInformation}});

  return {getAlgodClient, accountInformation, exclude};
}

describe("PeraWalletConnect.resolveArc60Signer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the account itself as the signer when it is not rekeyed", async () => {
    const pera = new PeraWalletConnect({chainId: 416002});

    mockAccountInformation(pera, {});

    const resolution = await pera.resolveArc60Signer(account.addr.toString());

    expect(resolution).toEqual({
      accountAddress: account.addr.toString(),
      signerAddress: account.addr.toString(),
      signer: algosdk.decodeAddress(account.addr.toString()).publicKey,
      isRekeyed: false,
      network: "testnet"
    });
  });

  it("returns the on-chain auth address as the signer when the account is rekeyed", async () => {
    const pera = new PeraWalletConnect({chainId: 416002});

    mockAccountInformation(pera, {authAddr: authAccount.addr.toString()});

    const resolution = await pera.resolveArc60Signer(account.addr.toString());

    expect(resolution.accountAddress).toBe(account.addr.toString());
    expect(resolution.signerAddress).toBe(authAccount.addr.toString());
    expect(resolution.signer).toEqual(
      algosdk.decodeAddress(authAccount.addr.toString()).publicKey
    );
    expect(resolution.isRekeyed).toBe(true);
  });

  it("requests only the account header, so accounts over algod's resource limit still resolve", async () => {
    // Without exclude=all algod answers 400 "Result limit exceeded" for accounts
    // holding more than MaxAPIResourcesPerAccount assets/apps; auth-addr is part
    // of the header and does not need the resources.
    const pera = new PeraWalletConnect({chainId: 416002});

    const {exclude} = mockAccountInformation(pera, {});

    await pera.resolveArc60Signer(account.addr.toString());

    expect(exclude).toHaveBeenCalledWith("all");
  });

  it("looks the account up on the session's network when the chain id is specific", async () => {
    const pera = new PeraWalletConnect({chainId: 416001});

    const {getAlgodClient, accountInformation} = mockAccountInformation(pera, {});

    const resolution = await pera.resolveArc60Signer(account.addr.toString());

    expect(getAlgodClient).toHaveBeenCalledWith("mainnet");
    expect(accountInformation).toHaveBeenCalledWith(account.addr.toString());
    expect(resolution.network).toBe("mainnet");
  });

  it("accepts an explicit network that matches the pinned session", async () => {
    const pera = new PeraWalletConnect({chainId: 416002});

    const {getAlgodClient} = mockAccountInformation(pera, {});

    const resolution = await pera.resolveArc60Signer(account.addr.toString(), "testnet");

    expect(getAlgodClient).toHaveBeenCalledWith("testnet");
    expect(resolution.network).toBe("testnet");
  });

  it("throws SIGN_DATA_NETWORK_MISMATCH when an explicit network contradicts the pinned session", async () => {
    // The wallet only serves a pinned session while it is on that network, so a
    // resolution read elsewhere can never match what the wallet validates.
    const pera = new PeraWalletConnect({chainId: 416001});

    const {getAlgodClient} = mockAccountInformation(pera, {});

    await expect(
      pera.resolveArc60Signer(account.addr.toString(), "testnet")
    ).rejects.toMatchObject({data: {type: "SIGN_DATA_NETWORK_MISMATCH"}});
    expect(getAlgodClient).not.toHaveBeenCalled();
  });

  it("uses the explicit network for an all-networks session", async () => {
    const pera = new PeraWalletConnect();

    const {getAlgodClient} = mockAccountInformation(pera, {});

    const resolution = await pera.resolveArc60Signer(account.addr.toString(), "mainnet");

    expect(getAlgodClient).toHaveBeenCalledWith("mainnet");
    expect(resolution.network).toBe("mainnet");
  });

  it("throws SIGN_DATA_NETWORK_REQUIRED for an all-networks session without an explicit network", async () => {
    for (const pera of [
      new PeraWalletConnect(),
      new PeraWalletConnect({chainId: 4160})
    ]) {
      const {getAlgodClient} = mockAccountInformation(pera, {});

      await expect(
        pera.resolveArc60Signer(account.addr.toString())
      ).rejects.toMatchObject({
        data: {type: "SIGN_DATA_NETWORK_REQUIRED"},
        message: expect.stringContaining("all networks")
      });
      expect(getAlgodClient).not.toHaveBeenCalled();
    }
  });

  it("throws SIGN_DATA_NETWORK_UNSUPPORTED for a betanet session, even with an explicit network", async () => {
    // connect has algod access for mainnet and testnet only; the wallet will
    // validate on betanet, so no supported network can give the right answer.
    const pera = new PeraWalletConnect({chainId: 416003});

    const {getAlgodClient} = mockAccountInformation(pera, {});

    for (const network of [undefined, "mainnet" as const]) {
      await expect(
        pera.resolveArc60Signer(account.addr.toString(), network)
      ).rejects.toMatchObject({
        data: {type: "SIGN_DATA_NETWORK_UNSUPPORTED"},
        message: expect.not.stringContaining("all networks")
      });
    }
    expect(getAlgodClient).not.toHaveBeenCalled();
  });

  it("throws SIGN_DATA_NETWORK_UNSUPPORTED for a network value other than mainnet or testnet", async () => {
    // Plain-JS callers bypass the type; a bogus value must not fall through to
    // the credential picker, which treats anything but "mainnet" as testnet.
    const pera = new PeraWalletConnect({chainId: 416002});

    const {getAlgodClient} = mockAccountInformation(pera, {});

    await expect(
      pera.resolveArc60Signer(account.addr.toString(), "Mainnet" as any)
    ).rejects.toMatchObject({data: {type: "SIGN_DATA_NETWORK_UNSUPPORTED"}});
    expect(getAlgodClient).not.toHaveBeenCalled();
  });

  it("throws SIGN_DATA_AUTH_ADDR_LOOKUP_FAILED carrying the cause instead of assuming no rekey", async () => {
    const pera = new PeraWalletConnect({chainId: 416002});
    const failure = new Error("network down");

    mockAccountInformation(pera, {failure});

    await expect(pera.resolveArc60Signer(account.addr.toString())).rejects.toMatchObject({
      data: {type: "SIGN_DATA_AUTH_ADDR_LOOKUP_FAILED", detail: failure}
    });
  });

  it("throws SIGN_DATA_INVALID_ADDRESS for a malformed account address before touching the network", async () => {
    const pera = new PeraWalletConnect({chainId: 416002});

    const {getAlgodClient} = mockAccountInformation(pera, {});

    await expect(pera.resolveArc60Signer("not-an-address")).rejects.toMatchObject({
      data: {type: "SIGN_DATA_INVALID_ADDRESS"}
    });
    expect(getAlgodClient).not.toHaveBeenCalled();
  });
});
