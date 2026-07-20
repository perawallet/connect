import {describe, it, expect, afterEach} from "vitest";

import {
  isLargeScreen,
  isMediumScreen,
  isSmallScreen,
  isXSmallScreen,
  setVhVariable
} from "../screenSizeUtils";
import {
  MEDIUM_SCREEN_BREAKPOINT,
  SMALL_SCREEN_BREAKPOINT,
  XSMALL_SCREEN_BREAKPOINT
} from "../screenSizeConstants";

function setClientWidth(width: number) {
  Object.defineProperty(document.documentElement, "clientWidth", {
    configurable: true,
    value: width
  });
}

describe("screenSizeUtils", () => {
  afterEach(() => {
    // Reset to the jsdom default so tests stay independent.
    setClientWidth(0);
  });

  describe("breakpoint checks", () => {
    it("treats width >= MEDIUM breakpoint as a large screen", () => {
      setClientWidth(MEDIUM_SCREEN_BREAKPOINT);

      // The boundary is inclusive on both sides.
      expect(isLargeScreen()).toBe(true);
      expect(isMediumScreen()).toBe(true);
    });

    it("treats width just below MEDIUM breakpoint as not large", () => {
      setClientWidth(MEDIUM_SCREEN_BREAKPOINT - 1);

      expect(isLargeScreen()).toBe(false);
      expect(isMediumScreen()).toBe(true);
    });

    it("detects a small screen at the SMALL breakpoint", () => {
      setClientWidth(SMALL_SCREEN_BREAKPOINT);

      expect(isSmallScreen()).toBe(true);
      expect(isXSmallScreen()).toBe(false);
    });

    it("detects an extra-small screen at the XSMALL breakpoint", () => {
      setClientWidth(XSMALL_SCREEN_BREAKPOINT);

      expect(isXSmallScreen()).toBe(true);
      expect(isSmallScreen()).toBe(true);
    });

    it("does not flag a wide screen as small", () => {
      setClientWidth(MEDIUM_SCREEN_BREAKPOINT + 100);

      expect(isSmallScreen()).toBe(false);
      expect(isXSmallScreen()).toBe(false);
    });
  });

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
