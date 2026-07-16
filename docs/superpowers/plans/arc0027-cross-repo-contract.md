# ARC-0027 cross-repo contract checklist

Shared expectations between `@perawallet/connect` and the Pera browser
extension. Keep in sync to prevent drift.

- **ARC-60 sign_message**: request `params` must satisfy the extension's
  `arc60WireSchema` (`packages/signing/src/utils/arc60-wire.ts`): `data`,
  `signer`, `domain`, `authenticatorData` (base64/string), optional
  `requestId`/`hdPath`, `metadata: {scope:number, encoding:string}`. Response:
  `{providerId, signature}` where `signature` is base64 and verifies as
  `ed25519(sha256(data) ‖ sha256(authenticatorData))`.
- **discover response icon field**: confirm `icon` vs `iconUrl`. Connect
  tolerates both (`DiscoverResult`); the extension should settle on one.
- **Shared fixture** (TODO with extension team): a canonical SIWA request +
  expected signature, asserted by Connect's `verifyArc60Signature` and the
  extension's signing pipeline test.
