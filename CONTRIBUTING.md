# Contributing to agent-device-flutter

Thanks for your interest. This document is the authoritative guide for anyone — human or agent — submitting changes.

## Ground rules

- Keep the snapshot schema stable. Fields: `type`, `label`, `value`, `rect`, `enabled`, `hittable`, and normalized roles (`Button`, `StaticText`, `TextField`, `Image`, `Other`). New fields require a major-version bump after 1.0.
- Cross-platform code paths stay framework-neutral. Flutter-specific logic lives under `src/flutter/` or behind a Flutter-gated feature flag.
- Installed-app automation must never require a Dart SDK on `$PATH`. Dart tooling is opt-in for `dev-run` and `hot-reload` only.
- No emoji in source, docs, commits, or PR descriptions unless a maintainer explicitly asks.
- Don't add inline comments that only restate what the code says. Only add a comment when the *why* is non-obvious.

## Toolchain

| Tool     | Version              | Purpose                           |
| -------- | -------------------- | --------------------------------- |
| Node.js  | `>= 22`              | Runtime                           |
| pnpm     | `>= 9`               | Package manager                   |
| vitest   | (pinned in lockfile) | Unit + integration tests          |
| oxlint   | (pinned in lockfile) | Lint                              |
| oxfmt    | (pinned in lockfile) | Format                            |
| Flutter  | `>= 3.22` (stable)   | Required only for dev-runtime work|
| Xcode    | `>= 15`              | Required only for iOS work        |
| adb      | (any recent)         | Required only for Android work    |

## Local setup

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

For end-to-end tests that need a real device, set `AGENT_DEVICE_FLUTTER_E2E=1`. CI stays green without it.

```bash
AGENT_DEVICE_FLUTTER_E2E=1 pnpm test:e2e
```

## Branching & commits

- Branch off `main`. Short-lived, one purpose per branch.
- One logical change per PR. Small, reviewable diffs.
- Commit subject: `type: concise summary` (`feat:`, `fix:`, `docs:`, `build:`, `refactor:`, `test:`, `chore:`). Keep under 70 characters.
- Body explains *why*. The diff shows *what*.
- Never skip hooks (`--no-verify`) or force-push shared branches.

## Testing requirements

- Every new CLI flag gets a vitest covering the parsed shape and the happy path.
- Anything that touches snapshot output gets a golden test with fixtures under `__fixtures__/`.
- Platform adapters (`src/platforms/<platform>/…`) get at least one fake-runner test that doesn't need a real device.
- Integration tests may spawn the real `agent-device-flutter` binary. Do not mock the CLI entrypoint — mocks drift from reality.

## Documentation

- User-facing changes update `README.md`.
- Agent-facing changes update `AGENTS.md` and, if relevant to Claude Code workflows, `CLAUDE.md`.
- Every user-visible change gets a `CHANGELOG.md` entry under `[Unreleased]`.

## Code review

- Every PR needs one maintainer approval.
- Security-sensitive changes (install-source trust list, remote-config parsing, tunnel endpoints, shell-invocation paths) need a second reviewer.
- Review comments about framework-boundary naming are load-bearing — they keep the core neutral.

## Releases

- Versioning follows SemVer.
- Pre-1.0, minor versions may break public API. Each break is called out explicitly in `CHANGELOG.md`.
- Release notes are cut directly from `CHANGELOG.md`.

## Reporting security issues

Do not file a public GitHub issue for a security report. Email the maintainers privately (contact in `package.json#author`) with reproduction steps and blast-radius assessment. Expect an acknowledgement within a few business days.

## Code of Conduct

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).
