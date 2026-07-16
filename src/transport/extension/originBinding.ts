// Ported from pera-browser-extension packages/signing/src/utils/arc60-wire.ts
// so the client-side pre-check matches the extension's enforcing logic.
export function hostFromMaybeUrl(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const candidate = trimmed.includes("//") ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);

    // Userinfo smuggling ("trusted.com@evil.com") is never legitimate; return
    // the raw string so the comparison fails safe (reports a mismatch).
    if (url.username || url.password) {
      return trimmed;
    }

    return url.host;
  } catch {
    return trimmed;
  }
}

export function isArc60OriginMismatch(
  domain: string,
  verifiedOrigin: string | undefined
): boolean {
  if (!verifiedOrigin) {
    return false;
  }

  return hostFromMaybeUrl(domain) !== hostFromMaybeUrl(verifiedOrigin);
}
