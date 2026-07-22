import {describe, it, expect} from "vitest";

import {setVhVariable} from "../screenSizeUtils";

describe("screenSizeUtils", () => {
  describe("setVhVariable", () => {
    it("sets the --pera-wallet-vh custom property from window height", () => {
      Object.defineProperty(window, "innerHeight", {configurable: true, value: 800});

      setVhVariable();

      expect(document.documentElement.style.getPropertyValue("--pera-wallet-vh")).toBe(
        "8px"
      );
    });
  });
});
