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
