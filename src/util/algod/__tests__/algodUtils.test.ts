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

      expect(credentials.server.client).toContain("node-mainnet");
      expect(credentials.server.indexer).toContain("indexer-mainnet");
      expect(credentials.tokens.client).toEqual(expect.any(String));
      expect(credentials.port).toBe(443);
    });

    it("returns testnet servers for the testnet network", () => {
      const credentials = getAlgosdkCredentialsForNetwork("testnet", "algodev");

      expect(credentials.server.client).toContain("node-testnet");
      expect(credentials.server.indexer).toContain("indexer-testnet");
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

    it("maps the generic algorand chain id to mainnet", () => {
      expect(getNetworkFromChainId(ALGORAND_NODE_CHAIN_ID)).toBe("mainnet");
    });

    it("maps the testnet chain id to testnet", () => {
      expect(getNetworkFromChainId(TESTNET_NODE_CHAIN_ID)).toBe("testnet");
    });

    it("falls back to mainnet for unrecognized chain ids (e.g. betanet)", () => {
      expect(getNetworkFromChainId(BETANET_NODE_CHAIN_ID)).toBe("mainnet");
    });
  });
});
