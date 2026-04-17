# CLAUDE.md

Project memory for Claude Code sessions inside `agent-device-flutter`.

This file is loaded automatically by Claude Code. Keep it terse — only conventions and facts that save a future session from having to re-derive them. For human-facing docs, use `README.md`, `CONTRIBUTING.md`, or `AGENTS.md` instead.

## What this project is

A Flutter-focused UI automation CLI for iOS, Android, macOS, Linux and their TV variants. It takes snapshots of the OS accessibility tree, assigns stable refs (`@e7`), and drives the app through `press` / `fill` / `scroll` / `close`. Designed to be piloted by AI agents or scripted via `.adf` replay files.

Standalone project. Do not assume it is a fork, companion, or peer of any other codebase — there is no parent to defer to.

## Toolchain

- Node.js `>= 22`, pnpm `>= 9`, vitest, oxlint, oxfmt, tsc.
- `pnpm install` → `pnpm build` → `pnpm test` → `pnpm lint` → `pnpm typecheck`.
- Flutter SDK only required for dev-runtime work (`dev-run`, `hot-reload`). Everything else runs without a Dart toolchain.
- E2E tests gate on `AGENT_DEVICE_FLUTTER_E2E=1`.

## Conventions Claude should follow

- **No emoji** anywhere — source, docs, commits, PR bodies — unless the user explicitly asks.
- **No comments that restate code.** Only add a comment when the *why* is non-obvious (hidden constraint, subtle invariant, surprising behavior).
- **No docstring paragraphs.** One short line max.
- **Snapshot schema is fixed.** Fields: `type`, `label`, `value`, `rect`, `enabled`, `hittable`, role. Don't extend it to carry Flutter-specific data — add a sibling command instead.
- **Cross-platform code stays framework-neutral.** Flutter-specific logic lives under `src/flutter/` or behind a feature flag.
- **Installed-app automation must work without Dart on `$PATH`.** Dart tooling is opt-in for `dev-run` and `hot-reload` only.
- **Refs over labels.** Prefer `@e<N>` or `#identifier="..."` to `#label="..."` in scripts.
- **Commit subject under 70 chars, type-prefixed** (`feat:`, `fix:`, `docs:`, `build:`, `refactor:`, `test:`, `chore:`). Body explains *why*.
- **Never `--no-verify`.** Fix the hook, don't bypass it.

## What Claude should check before acting

- Before touching `src/platforms/`: confirm the change stays framework-neutral.
- Before adding a CLI flag: confirm the happy-path vitest exists.
- Before running `flutter build`, `pub get`, `pod install`, or `gradle sync`: confirm with the user — these mutate lockfiles and caches.
- Before any `rm -rf`: confirm scope with the user.

## Session loop Claude should drive

```bash
agent-device-flutter open <target>
agent-device-flutter snapshot -i
agent-device-flutter press @e<N>
agent-device-flutter snapshot -i     # always re-snapshot after acting
agent-device-flutter close
```

If `snapshot -i` disagrees with `screenshot` twice in a row, stop and report the discrepancy — don't invent a fix.

## Files a session typically touches

- `README.md` — user-facing surface
- `CHANGELOG.md` — every user-visible change
- `AGENTS.md` — agent operating conventions
- `src/cli/` — command entrypoints
- `src/platforms/{ios,android,linux,macos}/` — per-platform adapters
- `src/flutter/` — Flutter-specific (detect / doctor / dev-runtime)
- `__fixtures__/` — snapshot golden files

## Things Claude should *not* do

- Add Flutter-specific fields to the shared snapshot schema
- Mock the CLI entrypoint in integration tests
- Treat this project as if it imports or extends another agent-device codebase
- Auto-upgrade Flutter, Node, or pnpm versions without user confirmation
- Write planning / analysis / decision markdown files unless the user asks

## Release & versioning

- SemVer. Pre-1.0 (current): minor versions may break public API; each break is called out in `CHANGELOG.md`.
- Release notes are cut from `CHANGELOG.md` `[Unreleased]` section.

## When in doubt

Ask the user. Cheap to confirm, expensive to undo.
