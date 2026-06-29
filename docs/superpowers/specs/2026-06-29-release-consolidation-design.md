# Release & Branching Consolidation

**Date:** 2026-06-29
**Authors:** Will Beaumont, Yasin Çalışkan
**Status:** Approved (design)

## Background

The project currently ships from **two branches** and **two npm packages**:

| | `main` → `release.yml` | `beta-v1` → `beta-v1-release.yml` |
|---|---|---|
| npm package | `@perawallet/connect` | `@perawallet/connect-beta` |
| version | `1.5.2` (`latest`) | `1.5.11` |
| dist-tags | `latest: 1.5.2` | `latest: 1.5.6`, `beta-v1: 1.5.10` |
| trigger | push to `main` | push to `beta-v1` |
| package manager | npm (`package-lock.json`) | pnpm (`pnpm-lock.yaml`) |

Two problems with this setup:

- **`main` is effectively dead.** `beta-v1` is 46 commits ahead / 1 behind, and is even on a
  different package manager. Real development happens on `beta-v1`; `@perawallet/connect` has been
  frozen at `1.5.2`. The lone main-only commit (#188, a perf change) appears subsumed by
  `beta-v1`'s `1eea18a` ("re-prime config promises") — to be confirmed during implementation.
- **The dual-package / dual-tag scheme is a footgun.** A bare `npm i @perawallet/connect-beta`
  resolves to `1.5.6` — *older* than the `beta-v1`-tagged `1.5.10`. Switching between stable and
  beta requires consumers to change the package *name* (and therefore import paths).

## Goals

- One npm package: `@perawallet/connect`.
- One trunk branch: `main`.
- Beta releases as semver prereleases (`1.6.0-beta.N`) under the `beta` dist-tag; stable under
  `latest`. Consumers switch channels with a tag, not a package-name swap:
  `npm i @perawallet/connect` (stable) / `@perawallet/connect@beta` (prerelease).
- Releases are explicit, auditable, and maintainer-controlled.

## Non-goals

- Adopting release automation (semantic-release / changesets / release-please). These derive
  versions from commits and/or publish on every merge, which conflicts with the deliberate
  tag-triggered model and (for semantic-release) would reintroduce a long-lived `beta` branch.
  Revisit only if release volume grows or the repo goes multi-package (YAGNI for now).
- Bumping to a major version. The accumulated changes (algosdk v3 peer dep, ESM-only bundle, WC
  client swap) are arguably breaking, but we continue the `1.x` line per maintainer decision.

## Design

### 1. Branch consolidation

`main` becomes the single trunk, carrying `beta-v1`'s content (the real codebase).

- Merge `beta-v1` → `main` taking `beta-v1` as the source of truth.
- Confirm the main-only commit #188 is fully subsumed by `beta-v1`'s `1eea18a` before discarding
  main's version of it.
- Delete the `beta-v1` branch. Default branch stays `main`.
- All future work — including betas — happens on `main`.

### 2. Package identity

On the unified trunk, `package.json`:

- `name`: `@perawallet/connect`
- `version`: `1.6.0-beta.0`
- `description`: drop "Beta version of …".

### 3. Single tag-triggered release workflow

Delete both `release.yml` and `beta-v1-release.yml`; replace with one tag-triggered
`.github/workflows/release.yml`. All existing security hardening is preserved (pinned action SHAs,
least-privilege permissions, OIDC provenance, `persist-credentials: false`).

```yaml
name: "🚀 release"

on:
  push:
    tags:
      - "v*"

# Least-privilege default. The publish job opts into id-token + contents below.
permissions:
  contents: read

jobs:
  release:
    name: 🚀 release
    runs-on: ubuntu-latest
    permissions:
      # OIDC token for npm trusted-publisher provenance.
      id-token: write
      # Required to create the GitHub Release.
      contents: write
    steps:
      - name: Setup repo
        uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6.0.3
        with:
          persist-credentials: false

      - name: Setup pnpm
        uses: pnpm/action-setup@fc06bc1257f339d1d5d8b3a19a8cae5388b55320 # v5.0.0

      - name: Setup Node.js
        uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version-file: ".tool-versions"
          registry-url: https://registry.npmjs.org
          cache: pnpm

      - name: Build app
        run: pnpm install --frozen-lockfile && pnpm run build:release

      - name: Audit dependencies
        run: pnpm audit --prod --audit-level=moderate

      - name: Resolve release channel
        id: channel
        run: |
          TAG_VERSION="${GITHUB_REF_NAME#v}"
          PKG_VERSION="$(node -p "require('./package.json').version")"
          if [ "$TAG_VERSION" != "$PKG_VERSION" ]; then
            echo "::error::Tag ($TAG_VERSION) does not match package.json ($PKG_VERSION)"
            exit 1
          fi
          if [[ "$TAG_VERSION" == *-* ]]; then
            echo "dist_tag=beta" >> "$GITHUB_OUTPUT"
          else
            echo "dist_tag=latest" >> "$GITHUB_OUTPUT"
          fi

      - name: 🚀 publish
        run: pnpm publish --access public --tag ${{ steps.channel.outputs.dist_tag }} --provenance --no-git-checks

      - name: Create GitHub Release
        uses: softprops/action-gh-release@<PIN-TO-SHA> # v2 — pin to a commit SHA before merge
        with:
          generate_release_notes: true
          prerelease: ${{ contains(github.ref_name, '-') }}
```

Key behaviours:

- **Trigger:** `push: tags: ['v*']` — fires only on a tagged release, not on every merge.
- **Guard:** the `Resolve release channel` step fails the run if the git tag and `package.json`
  version drift apart. This makes the `npm version` → `git push --follow-tags` flow safe.
- **Channel:** a tag containing `-` (`v1.6.0-beta.0`) publishes under `--tag beta`; a clean tag
  (`v1.6.0`) publishes under `--tag latest`.
- **GitHub Release:** each tag produces a Release with auto-generated notes; beta tags are marked
  as prereleases.

### 4. Release procedure (to document in README/CONTRIBUTING)

- **Cut a beta:** `npm version prerelease --preid beta` (→ `1.6.0-beta.0`, then `-beta.1`, …) →
  `git push --follow-tags` → auto-publishes to `@beta`.
- **Promote to stable:** `npm version 1.6.0` → `git push --follow-tags` → auto-publishes to
  `@latest`.
- **Consumers:** `npm i @perawallet/connect` (stable) / `@perawallet/connect@beta` (prerelease).

### 5. Deprecate the old package (one-time, manual)

```
npm deprecate @perawallet/connect-beta "Deprecated — use @perawallet/connect@beta instead."
```

Existing `-beta` versions remain installable but warn on install. Not unpublished.

## Manual prerequisites (outside the repo)

These require npm/GitHub auth and cannot be done purely in-repo:

1. **Trusted publisher for `@perawallet/connect`.** The current OIDC trusted-publisher config is
   scoped to `@perawallet/connect-beta`. Add/confirm a trusted-publisher entry for
   `@perawallet/connect` pointing at the new `release.yml` workflow, or the publish step fails auth.
2. **`npm deprecate`** the old package (see §5).
3. **Pin `softprops/action-gh-release`** to a commit SHA before merging the workflow.

## Rollout order

1. Confirm #188 is subsumed; merge `beta-v1` → `main` (favouring `beta-v1`).
2. Update `package.json` (name, version `1.6.0-beta.0`, description).
3. Replace the two workflows with the single `release.yml`.
4. Confirm/add the `@perawallet/connect` trusted-publisher config.
5. Cut `v1.6.0-beta.0`; verify it publishes to `@beta` and creates a GitHub Release.
6. Delete the `beta-v1` branch.
7. `npm deprecate @perawallet/connect-beta`.
8. Update README/CONTRIBUTING with the release procedure and consumer install instructions.

## Decisions log

- **Release trigger:** git tags (chosen over manual dispatch / infer-from-version / changesets).
- **Old `-beta` package:** deprecate + redirect (not unpublish).
- **First version:** `1.6.0` line / `1.6.0-beta.0` (minor, not major).
- **Versioning tooling:** manual `npm version` + tag (not semantic-release/changesets).
- **Release notes:** GitHub Release step folded into the workflow from the first cut.
```
