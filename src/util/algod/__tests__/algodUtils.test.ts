import {describe, it, expect} from "vitest";

import {
  getAlgosdkCredentialsForNetwork,
  getChainIdForNetwork,
  getNetworkFromChainId
} from "../algodUtils";
import {
  MAINNET_NODE_CHAIN_ID,
  TESTNET_NODE_CHAIN_ID,
  BETANET_NODE_CHAIN_ID,
  ALGORAND_NODE_CHAIN_ID
} from "../algodConstants";

describe("algodUtils", () => {
  describe("getAlgosdkCredentialsForNetwork", () => {
    it("returns mainnet servers for the mainnet network", () => {
      const credentials = getAlgosdkCredentialsForNetwork("mainnet", "algodev");

      expect(credentials.server.client).toContain("mainnet-api");
      expect(credentials.port).toBe(443);
    });

    it("returns testnet servers for the testnet network", () => {
      const credentials = getAlgosdkCredentialsForNetwork("testnet", "algodev");

      expect(credentials.server.client).toContain("testnet-api");
    });

    it("defaults to a public node, not Pera's own infrastructure", () => {
      (["mainnet", "testnet"] as const).forEach((network) => {
        expect(
          getAlgosdkCredentialsForNetwork(network, "algodev").server.client
        ).not.toContain("perawallet.app");
      });
    });

    it("ships no API token, so none is published in the bundle", () => {
      (["mainnet", "testnet"] as const).forEach((network) => {
        expect(getAlgosdkCredentialsForNetwork(network, "algodev").tokens.client).toBe(
          ""
        );
      });
    });
  });

  describe("getChainIdForNetwork", () => {
    it("maps mainnet to the mainnet chain id", () => {
      expect(getChainIdForNetwork("mainnet")).toBe(MAINNET_NODE_CHAIN_ID);
    });

    it("maps testnet to the testnet chain id", () => {
      expect(getChainIdForNetwork("testnet")).toBe(TESTNET_NODE_CHAIN_ID);
    });
  });

  describe("getNetworkFromChainId", () => {
    it("maps the mainnet chain id to mainnet", () => {
      expect(getNetworkFromChainId(MAINNET_NODE_CHAIN_ID)).toBe("mainnet");
    });

    it("maps the testnet chain id to testnet", () => {
      expect(getNetworkFromChainId(TESTNET_NODE_CHAIN_ID)).toBe("testnet");
    });

    it("returns null for the all-networks chain id, which pins no network", () => {
      expect(getNetworkFromChainId(ALGORAND_NODE_CHAIN_ID)).toBeNull();
    });

    it("returns null for an unset chain id", () => {
      expect(getNetworkFromChainId(undefined)).toBeNull();
    });

    it("returns null for a network this client has no algod for (betanet)", () => {
      expect(getNetworkFromChainId(BETANET_NODE_CHAIN_ID)).toBeNull();
    });
  });
});
