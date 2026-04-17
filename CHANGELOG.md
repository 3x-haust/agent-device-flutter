# Changelog

All notable changes to `agent-device-flutter` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-04-17

First stable release. The CLI now drives real debug-mode Flutter apps end-to-end through the Dart VM Service, on iOS Simulators, Android devices/emulators, macOS, and Linux.

### Added

- `src/flutter/vm-client.ts` — JSON-RPC 2.0 WebSocket client for the Dart VM Service (listViews, callExtension, evaluate, …) with timeouts, error propagation, and auto-reconnect guards
- `src/flutter/semantics.ts` — parser for `ext.flutter.debugDumpSemanticsTreeInTraversalOrder` text output into the framework-neutral `SnapshotResult` schema, with global rect accumulation and role derivation from flags/actions
- `src/flutter/actions.ts` — VM-service-driven `snapshot` / `tap` / `fill` / `scroll` primitives using `WidgetsBinding.instance.handlePointerEvent(...)` (works without any in-app runtime package)
- `src/flutter/runtime.ts` — session-aware helpers (`snapshotWithSession`, `pressWithSession`, …) shared by every platform adapter
- `src/flutter/launcher.ts` — `flutter run --machine` supervisor with Unix-socket control channel (`reload` / `restart` / `stop` / `ping` ops) and robust event-stream parser
- `src/flutter/daemon-main.ts` — detached daemon entrypoint (`agent-device-flutter __daemon__ <json>`) so `dev-run` survives shell exit
- `src/cli/commands/dev-run.ts` — spawns the detached daemon, waits for `app.started`, and persists VM URI + launcher coords into the session
- `src/cli/commands/hot-reload.ts` — sends `reload` / `restart` to the launcher control socket
- Attach-only `open` mode: `agent-device-flutter open ws://…/ws` (or `--vm-service <uri>`) connects to an already-running Dart VM Service on any supported platform, no Flutter toolchain required
- Test coverage: `semantics.test.ts`, `launcher.test.ts`, `runtime.test.ts` (frame parser, URI parser, session guard, fixture-driven parse)

### Changed

- `PlatformAdapter` interface: `listDevices` + `open(inputs) → OpenResult` + `close(session)`. The per-platform `snapshot` / `press` / `fill` / `scroll` methods were dropped — actions are now framework-agnostic and live in `runtime.ts`
- `SessionState` extended with `vmServiceUri` and `launcher` (pid, controlSocketPath, projectRoot, appId, startedAt) fields
- `open` command: accepts `ws://` / `http://` VM service URIs as the positional target or via `--vm-service <uri>`; plain bundle-ids / apk paths now surface a friendly error pointing to `dev-run`
- iOS, Android, macOS, Linux adapters: share attach + close logic via `src/platforms/shared.ts`; device discovery stays platform-specific (simctl, adb, hostname)
- `doctor` command: delegates to `snapshotWithSession` instead of the adapter
- `dev-runtime.ts`: `discoverVmService`, `triggerHotReload`, `triggerHotRestart`, `parseVmServiceUri` are now real implementations (previously placeholder stubs)
- `src/index.ts` publishes the new runtime / launcher / VM-client surface for library consumers

### Removed

- `NotImplementedError` stubs on adapter action methods (no longer part of the interface)

### Breaking

- The `PlatformAdapter` interface shape changed: `snapshot` / `press` / `fill` / `scroll` were removed and `open` now takes `OpenInputs` and returns `OpenResult`. Custom adapters implemented against 0.1 must migrate.
- `open <bundle-id>` and `open <apk-path>` no longer raise `NotImplementedError` — they raise a specific error telling callers to pass a VM service URI or run `dev-run`.

## [0.1.0] — 2026-04-17

### Added

- Initial repo scaffolding: `README`, `LICENSE` (MIT), `CONTRIBUTING`, `AGENTS.md`, `CLAUDE.md`
- Code of Conduct (Contributor Covenant v2.1)
- GitHub issue and pull request templates
- `package.json` with `bin` entry for `agent-device-flutter`
- CLI skeleton: `detect`, `devices`, `open`, `close`, `snapshot`, `press`, `fill`, `scroll`, `doctor`, `replay`
- Platform adapters for `ios`, `android`, `macos`, `linux` (device listing implemented; other ops gated behind `NotImplementedError` pending 0.2)
- Flutter project detection from `pubspec.yaml`
- Semantics coverage audit (`doctor`) with unlabeled / missing-identifier / duplicate-identifier findings
- `.adf` replay script parser with quote + escape handling
- Snapshot formatting, visible-first output, unified diff
- `example/` runnable Flutter sample app (counter + sign-up) with `.adf` flows
- Vitest suite covering parser, detection, doctor, replay scripts, snapshot format, and the `example/` project
