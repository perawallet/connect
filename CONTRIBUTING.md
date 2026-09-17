### Contributing

To contribute to the codebase, you will need to fork the repository.

The following steps will get you setup to contribute changes to this repo:

- Fork the repo and create your branch from `main`.
- Install depencencies and build.

We use [pnpm](https://pnpm.io) to manage installation of dependencies and running various scripts. To get everything installed, make sure you have pnpm and run `pnpm install` from the root of the repository.

#### Reporting new issues

When opening a new issue, always make sure to fill out the issue template.

- One issue, one bug: Please report a single bug per issue.
- Provide reproduction steps: List all the steps necessary to reproduce the issue. The person reading your bug report should be able to follow these steps to reproduce your issue with minimal effort.

#### Development

##### Building

Running `pnpm run build` from the root directory will run the build command for package.

##### Secrets

Never commit a credential. This package is published to npm, so anything in the
source ends up in a bundle that anyone can read, in git history that cannot be
rewritten away, and in released tarballs that cannot be recalled. Read values
from the environment instead.

Two automated checks back this up:

- **Locally**, a `pre-commit` hook scans staged changes with
  [gitleaks](https://github.com/gitleaks/gitleaks). `pnpm install` enables it by
  pointing `core.hooksPath` at `.githooks/`. If gitleaks is not installed the
  hook warns and lets the commit through, so install it —
  `brew install gitleaks` on macOS.
- **In CI**, `pr-check` scans the branch history and the release workflow scans
  the built bundle before publishing. These fail the build; they are the
  enforcement point, not the hook.

If a scan flags something that is genuinely not a secret, mark it at the source
with a `// gitleaks:allow` comment on the line so the reason shows up in review.
Only add a fingerprint to `.gitleaksignore` for a secret that is already public
*and* has been revoked — never to silence a live credential.

If a real credential does get committed, removing it in a later commit does not
un-expose it. It has to be rotated at the provider.

These scans are a safety net, not a guarantee. gitleaks' generic rule keys off
context — a long random string next to a word like `token`, `key` or `secret`.
A credential assigned to an unsuggestive name can slip past it. Do not treat a
green scan as permission to commit something you know is sensitive.

##### Branch Organization

- `main` Branch: the single trunk for all development. Both stable and beta releases are cut from `main`.

##### Feature Branches

When starting to work on a new feature development or a bug fix, you must branch out from `main`. The name of the branch should reflect its purpose.

##### Releasing

`@perawallet/connect` is published from `main` and releases are triggered by pushing a git tag. The
[release workflow](.github/workflows/release.yml) determines the npm dist-tag from the version:
a prerelease version (containing a `-`) publishes under `beta`, a clean version publishes under `latest`.

- **Cut a beta:** `npm version prerelease --preid beta` (e.g. `1.6.0-beta.0` → `1.6.0-beta.1` → …)
  then `git push --follow-tags`. Published to `@perawallet/connect@beta`.
- **Promote to stable:** `npm version 1.6.0` then `git push --follow-tags`. Published to
  `@perawallet/connect@latest`.

Consumers install stable with `npm i @perawallet/connect` and prereleases with
`npm i @perawallet/connect@beta`.

##### Commit Messages

To standardize our commit messages, we follow the convention described on Conventional Commits.

```ssh
feat(connect-modal): change typography of connect modal.
^--^^----^  ^----------------------------------^
|   |       |
|   |       +-> Summary in present tense.
|   |
|   +-> The place that this change affected.
|
+-------> Type
```

##### Pull Requests

When the work on a feature/bug-fix branch is completed, a pull request (PR) should be opened to `main`.

##### PR Titles

A similar convention with the commit messages applies to PR titles. Avoid giving too much detail on the PR titles, maximum of 4-5 words would be enough to explain the purpose of the PR.

```ssh
<type>(scope): <pr summary>
```

##### PR Descriptions

Include the purpose of the PR, the changes you made, and the expected behavior to PR descriptions. Please fill the PR template, you can feel free to add more sections.

##### Work on local

You can work on your local project with this package. All you have to do is replace the version part of @perawallet/connect in the package.json file with "file:path/connect" like this.

```json
"@perawallet/connect": "file:../connect"
```

After doing this, you can run `pnpm run dev` and in this way, you can see the changes you have made to the package simultaneously.
