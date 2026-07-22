import {describe, it, expect} from "vitest";

import {isArc60OriginMismatch, hostFromMaybeUrl} from "../originBinding";

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

  it("is case-insensitive", () => {
    expect(isArc60OriginMismatch("ARC60.IO", "https://arc60.io")).toBe(false);
  });

  it("treats a differing port as a mismatch", () => {
    expect(isArc60OriginMismatch("arc60.io:8080", "https://arc60.io")).toBe(true);
  });

  it("treats an empty domain as a mismatch (fail safe)", () => {
    expect(isArc60OriginMismatch("", "https://arc60.io")).toBe(true);
  });

  it("ignores scheme differences and compares host only", () => {
    expect(isArc60OriginMismatch("http://arc60.io", "https://arc60.io")).toBe(false);
  });
});

describe("hostFromMaybeUrl", () => {
  it("extracts the host from a bare domain", () => {
    expect(hostFromMaybeUrl("arc60.io")).toBe("arc60.io");
  });

  it("extracts the host ignoring path and query", () => {
    expect(hostFromMaybeUrl("arc60.io/path?x=1")).toBe("arc60.io");
  });

  it("falls back to the trimmed, lowercased raw string on unparseable input", () => {
    expect(hostFromMaybeUrl("  ")).toBe("");
  });
});
