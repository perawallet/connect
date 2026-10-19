# Contributing to Pera Connect

## Getting started

```sh
pnpm install
pnpm run setup:hooks   # points git at .githooks/ (secret scan, commit message, pre-push checks)
```

Node comes from `.tool-versions` and pnpm from the `packageManager` field (`corepack enable` picks it up). Read [CLAUDE.md](CLAUDE.md) for how the code is laid out and the rules reviews come back to.

| Command              | Does                                                    |
| -------------------- | ------------------------------------------------------- |
| `pnpm dev`           | Rebuilds `dist/` on change                              |
| `pnpm test`          | Unit tests (`pnpm vitest run <path>` for one area)      |
| `pnpm lint`          | oxlint; `pnpm lint:types` adds the type-aware rules     |
| `pnpm format`        | oxfmt                                                   |
| `pnpm typecheck`     | `tsc --noEmit`                                          |
| `pnpm build`         | Bundle with Vite, declarations with `tsc`               |
| `pnpm check:package` | publint and arethetypeswrong against the packed tarball |
| `pnpm verify`        | Everything CI runs                                      |

### Trying a change in a dApp

Point the dApp at your checkout and run `pnpm dev` here:

```json
"@perawallet/connect": "file:../connect"
```

## Branching

`main` is the only long-lived branch; stable and beta releases are both cut from it. Branch off `main` as `<your-name>/<feature-or-fix>`:

```
john/fix-extension-reconnect
sarah/arc60-rekeyed-signer
```

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), enforced by the `commit-msg` hook:

```
feat(extension): get empty signatures from window.pera
fix(mobile): keep the stored session when the bridge is unreachable
docs: document the WalletConnect v1 transport
```

PR titles follow the same format. Fill in the PR template and squash-merge.

## Secrets

Never commit a credential. This package is published to npm, so anything in the source ends up in a bundle anyone can read, in git history that cannot be rewritten away, and in tarballs that cannot be recalled. Read values from the environment instead.

- **Locally**, the `pre-commit` hook scans staged changes with [gitleaks](https://github.com/gitleaks/gitleaks). Without gitleaks installed it warns and lets the commit through, so install it (`brew install gitleaks` on macOS).
- **In CI**, pre-merge scans the branch history and the release workflow scans the built bundle before publishing. These are the enforcement point, not the hook.

If a scan flags something that is not a secret, mark the line with a `// gitleaks:allow` comment so the reason shows in review. Only add a fingerprint to `.gitleaksignore` for a secret that is already public _and_ revoked. A committed credential stays exposed after a later commit removes it; it has to be rotated at the provider.

gitleaks keys off context (a long random string next to `token`, `key` or `secret`), so a credential under an unsuggestive name can slip past it. A green scan is a safety net, not permission.

## Releasing

Releases are published from `main` by pushing a tag; the [release workflow](.github/workflows/release-publish.yml) runs the pre-merge checks again, scans the bundle and publishes with npm provenance. A version containing `-` goes to the `beta` dist-tag, anything else to `latest`.

- **Beta:** `npm version prerelease --preid beta` (`1.9.0-beta.0` → `1.9.0-beta.1` → …), then `git push --follow-tags`.
- **Stable:** `npm version 1.9.0`, then `git push --follow-tags`.

## Reporting issues

One bug per issue, with the steps to reproduce it, the browser, and which wallet (Pera Mobile, Pera Web or the extension) was involved.
