import {describe, it, expect} from "vitest";

import {shuffleArray, concatArrays} from "../arrayUtils";

describe("arrayUtils", () => {
  describe("shuffleArray", () => {
    it("returns a new array without mutating the original", () => {
      const original = [1, 2, 3, 4, 5];
      const originalCopy = [...original];
      const result = shuffleArray(original);

      expect(result).not.toBe(original);
      expect(original).toEqual(originalCopy);
    });

    it("preserves the same elements", () => {
      const original = [1, 2, 3, 4, 5];
      const result = shuffleArray(original);

      expect(result).toHaveLength(original.length);
      expect([...result].sort()).toEqual([...original].sort());
    });

    it("handles empty and single-element arrays", () => {
      expect(shuffleArray([])).toEqual([]);
      expect(shuffleArray(["only"])).toEqual(["only"]);
    });
  });

  describe("concatArrays", () => {
    it("concatenates number arrays into a single Uint8Array", () => {
      const result = concatArrays([1, 2], [3, 4, 5]);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5]);
    });

    it("concatenates existing Uint8Arrays", () => {
      const result = concatArrays(new Uint8Array([9]), new Uint8Array([8, 7]));

      expect(Array.from(result)).toEqual([9, 8, 7]);
    });

    it("returns an empty Uint8Array when given no arguments", () => {
      const result = concatArrays();

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result).toHaveLength(0);
    });
  });
});
