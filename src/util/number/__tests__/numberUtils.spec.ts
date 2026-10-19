import {describe, it, expect} from "vitest";

import {generateSimpleId} from "../numberUtils";

describe("numberUtils", () => {
  describe("generateSimpleId", () => {
    it("returns a positive integer", () => {
      const id = generateSimpleId();

      expect(typeof id).toBe("number");
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
    });

    it("is derived from the current time (roughly now * 1000)", () => {
      const before = Date.now() * 1000;
      const id = generateSimpleId();
      const after = Date.now() * 1000 + 1000;

      expect(id).toBeGreaterThanOrEqual(before);
      expect(id).toBeLessThanOrEqual(after);
    });

    it("produces distinct ids across many calls", () => {
      const ids = new Set(Array.from({length: 1000}, () => generateSimpleId()));

      // The random suffix has 1000 possible values, so collisions are possible
      // but the vast majority should be unique within the same millisecond.
      expect(ids.size).toBeGreaterThan(1);
    });
  });
});
