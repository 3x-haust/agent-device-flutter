# AGENTS.md

Operating guide for AI agents (and humans who drive them) working inside `agent-device-flutter`. Read this once per session. The rules below are what separates reliable agent loops from flaky ones.

## Mental model

1. **Snapshot is truth.** Never guess UI state. Always call `snapshot -i` before acting.
2. **Refs over labels.** `@e7` is stable within a snapshot. Labels are localized and change per locale.
3. **Act, then re-snapshot.** Any `press`, `fill`, `scroll`, or `swipe` invalidates refs. Re-snapshot before the next action.
4. **Screenshot is visual truth.** When accessibility output disagrees with reality, trust `screenshot`, wait briefly, re-snapshot once. Don't loop stale snapshots.

## Canonical agent loop

```bash
agent-device-flutter open <target>
agent-device-flutter snapshot -i
agent-device-flutter press @e3
agent-device-flutter snapshot -i
agent-device-flutter fill @e7 "hello"
agent-device-flutter snapshot -i
agent-device-flutter close
```

For a known script, prefer `replay` — it handles retries and artifacts for you:

```bash
agent-device-flutter replay ./flows/checkout.adf --retries 2
```

## Snapshot rules for Flutter apps

- **Always use `-i`.** Full-tree snapshots on Flutter apps are noisy because the engine emits many layout-only nodes.
- **DEBUG banner + red error boxes are overlays.** They appear in snapshots as a top-right text node and a full-screen error card. Ignore them for navigation refs; they are not real UI.
- **Sparse Semantics → coordinates.** If `snapshot -i` returns few refs on a visibly populated screen, fall back to `snapshot --raw` and work off `rect` coordinates. Tell the user — this is a fixable gap in the app's `Semantics` tree, not a bug in the CLI.
- **`-i -d <n>` empty?** Retry once without `-d` before assuming the screen is empty. Flutter widget trees can be unexpectedly deep.
- **Stale snapshot on Android?** If output disagrees with the visible screen after a navigation, trust `screenshot`, wait ~300ms, take one fresh `snapshot -i`. Do not loop.

## Ref anchoring strategy

Preference order when writing scripts:

1. `@e<N>` refs from the most recent snapshot.
2. `#identifier="..."` — stable, matches `Semantics(identifier: ...)`.
3. `#label="..."` — use only when identifiers are unavailable and you know the locale.
4. Coordinate `rect` taps — last resort, brittle, screen-size dependent.

Anti-pattern: mixing labels across locales in the same script. Either gate by locale or switch to identifiers.

## `.adf` replay script conventions

- One action per line. Blank lines and `#` comments are allowed.
- `open` first, `close` last. A script that doesn't own session lifecycle should not be a replay script.
- Artifacts (`screenshot foo.png`) go to the working directory by default. Pass `--artifacts <dir>` to `replay` / `test` to redirect.
- Keep scripts under ~50 lines. Longer flows should decompose into smaller `.adf` files invoked from a shell wrapper.

## Dev-runtime (roadmap — not yet implemented)

When `dev-run` / `hot-reload` ship, agents will be able to:

- Launch `flutter run --machine` under supervision and wait for the Dart VM Service URL.
- Trigger hot reload (`r`) or hot restart (`R`) between snapshots.
- Inject a VM Service URL into a debug build running on a remote device.

Until then: if the user is running `flutter run` themselves, leave it alone. Don't try to manage the dev loop from the agent side.

## Red flags — stop and ask the user

- A proposed change adds Flutter-specific fields to the shared snapshot schema. **Stop.** Put Flutter-only output in a sibling command.
- A script mocks the CLI entrypoint in integration tests. **Stop.** Integration tests either spawn the real binary or skip.
- You are about to run `flutter build`, `pub get`, `pod install`, `gradle sync`, or any command that mutates a lockfile or cache. **Stop.** Confirm with the user first.
- You are about to `rm -rf` anything under `build/`, `.dart_tool/`, or a user's project directory. **Stop.** Confirm scope first.
- The snapshot disagrees with the screenshot twice in a row. **Stop.** Report the discrepancy rather than inventing a fix.

## Commit etiquette for agent-written PRs

- One logical change per commit. No "misc" commits.
- Subject under 70 chars. No trailing period.
- Body explains *why*. The diff shows *what*.
- Don't append agent attribution signatures to commit messages unless the user's repo convention already does so.

## Escalation

When in doubt, ask the user. Cheap to confirm, expensive to undo.
