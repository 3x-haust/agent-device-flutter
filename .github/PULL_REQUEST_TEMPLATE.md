## Summary

<!-- What does this PR change, and why? 1-3 bullets. -->

-
-

## Scope check

- [ ] Snapshot schema unchanged (or major-version bump justified)
- [ ] Cross-platform code paths stay framework-neutral
- [ ] Installed-app automation still works without Dart on `$PATH`

## Area

- [ ] CLI / command surface
- [ ] Snapshot / platform adapter
- [ ] Flutter-specific (`src/flutter/`)
- [ ] Replay / test runner
- [ ] Dev-runtime (`dev-run` / `hot-reload`)
- [ ] Docs / scaffolding

## Test plan

<!-- How did you verify this? E2E runs gated on AGENT_DEVICE_FLUTTER_E2E=1 are fine. -->

- [ ] `pnpm test`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] Manual check on a real Flutter app (describe device + build mode):

## Docs

- [ ] `README.md` updated if user-visible
- [ ] `CHANGELOG.md` entry added under `[Unreleased]`
- [ ] `AGENTS.md` / `CLAUDE.md` updated if agent loop changed

## Breaking changes

<!-- If yes, describe the migration path. Pre-1.0 breaks are allowed but must be explicit. -->

None.
