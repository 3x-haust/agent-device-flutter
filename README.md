# agent-device-flutter

A UI automation CLI for **Flutter** apps running on iOS, Android, macOS, Linux, and their TV variants.

`agent-device-flutter` drives real apps on real devices from the terminal: list accessibility trees, find widgets, tap, type, scroll, assert, replay scripts. It is designed for AI agents that need a deterministic, ref-based view of the UI, and for humans who want to script mobile flows without writing framework-specific test boilerplate.

Inspired by [`agent-device`](https://github.com/callstackincubator/agent-device) (a framework-agnostic, React Native-oriented automation CLI by Callstack). This project is a **standalone, independent implementation** focused on Flutter: it does not depend on, import, or wrap `agent-device`. We borrow the session-model and ref-based interaction idioms — the code, contracts, and release cycle are our own.

> Status: **stable 1.0.0**. Drives real debug-mode Flutter apps through the Dart VM Service on iOS Simulators, Android devices/emulators, macOS, and Linux.

## Features

- **Flutter-first**. Reads `pubspec.yaml` to detect project mode, flavors, and entrypoints. Surfaces `Semantics` widget coverage as a first-class concept.
- **Session model**. `open` a target, take a `snapshot`, act on refs (`@e3`), `close`. Same loop on every platform.
- **Dart VM Service snapshots**. Dumps the Flutter `Semantics` tree over the debug-mode VM Service — framework-native truth, no in-app runtime package required.
- **Ref-based interactions**. Snapshots assign stable `@e<N>` refs you can feed into `press`, `fill`, `scroll`.
- **Replay scripts**. `.adf` files capture a sequence of commands with retries and artifacts.
- **Dev-runtime hooks**. `dev-run` supervises `flutter run --machine` as a detached daemon; `hot-reload` / `hot-restart` reach it through a Unix-socket control channel from any shell.
- **Remote-ready**. Attach to any reachable Dart VM Service URI so CI and remote devices stay out of your laptop.

## Installation

```bash
npm install -g agent-device-flutter
# or
pnpm add -g agent-device-flutter
```

Requires Node.js `>= 22`.

Optional extras (only needed for the corresponding platform):

| Target              | Prereq                                                        |
| ------------------- | ------------------------------------------------------------- |
| iOS Simulator       | Xcode + `xcrun simctl`                                        |
| iOS physical device | `devicectl` (Xcode 15+) or `idevice*` toolchain               |
| Android             | `adb` on `$PATH`                                              |
| Linux               | AT-SPI2 runtime (`at-spi2-core`)                              |
| Flutter dev-runtime | Flutter SDK `>= 3.22` (only for `dev-run` / `hot-reload`)     |

## Quick start

There are two ways to open a session — pick whichever fits your workflow.

### A. Dev-run (launches the app for you, enables hot reload)

```bash
# From the Flutter project root:
agent-device-flutter dev-run .              # detached `flutter run --machine` daemon
agent-device-flutter snapshot -i
agent-device-flutter press @e7
agent-device-flutter fill @e12 "hello flutter"
agent-device-flutter hot-reload             # re-runs build_runner-style hot reload
agent-device-flutter hot-restart            # full restart of the root isolate
agent-device-flutter close                  # stops the daemon, clears the session
```

### B. Attach (no Flutter SDK required — just a reachable Dart VM Service)

```bash
# If you already have `flutter run`, Xcode, or Android Studio running the app,
# copy the Dart VM Service URL they printed (or `--observatory-uri`):
agent-device-flutter open ws://127.0.0.1:56799/xhwpYR3mplM=/ws
agent-device-flutter snapshot -i
agent-device-flutter press @e7
agent-device-flutter close
```

Either way, once the session exists every other command (`snapshot`, `press`, `fill`, `scroll`, `doctor`, `replay`) drives the VM Service directly and works identically on iOS, Android, macOS, and Linux.

## Snapshot example

```bash
$ agent-device-flutter snapshot -i
Snapshot: 9 visible nodes (14 total)
@e1 [application] "Runner"
  @e2 [window]
    @e4 [other] "Home"
      @e5 [navigation-bar] "Home"
        @e6 [button] "Menu"
        @e7 [text] "Home"
      @e8 [other] "Counter"
        @e9 [text] "0"
        @e10 [button] "Increment"
[off-screen below] 2 interactive items: "Settings", "About"
```

Options:

| Flag          | Description                                      |
| ------------- | ------------------------------------------------ |
| `-i`          | Interactive-only output (recommended for agents) |
| `-c`          | Compact — remove empty nodes                     |
| `-d <depth>`  | Limit tree depth                                 |
| `-s <scope>`  | Scope to a label, identifier, or `@ref`          |
| `--raw`       | Full tree (troubleshooting)                      |
| `--diff`      | Unified-style diff against the prior snapshot    |

## Semantics — making Flutter apps agent-ready

Snapshots are only as good as the accessibility information your widget tree exposes. Use `Semantics` to give agents stable, localizable anchors:

```dart
Semantics(
  identifier: 'submit-button',   // stable ref anchor — agents key off this
  label: 'Submit order',         // human-readable, localizable
  button: true,
  child: ElevatedButton(
    onPressed: _submit,
    child: const Text('Submit'),
  ),
)
```

Run `agent-device-flutter doctor` to scan a live screen and flag:

- Unlabeled interactive nodes (`Button` role with empty label)
- Duplicate `identifier` values on a single screen
- Screens where coordinate-only refs dominate

## Replay scripts

A `.adf` script is a sequence of commands with optional retries and artifact captures:

```text
open ./build/app/outputs/flutter-apk/app-debug.apk
snapshot -i
press @e10
fill @e12 "order-42"
press #label="Submit order"
assert visible #label="Thanks"
screenshot receipt.png
close
```

Run it:

```bash
agent-device-flutter replay ./flows/checkout.adf
agent-device-flutter test ./flows/ --retries 2 --artifacts ./out
```

## Example

See [`example/`](./example) for a runnable Flutter sample app (counter + sign-up form) with well-labeled `Semantics` widgets and ready-to-run `.adf` replay scripts. It is the recommended starting point for trying the CLI end-to-end on a real device.

## Non-goals

- Flutter Web automation (this project targets native a11y trees, not DOM)
- Replacing `flutter_driver` / `integration_test` for widget-level unit testing
- Windows host support (Windows is out of scope until demand emerges)

See [CHANGELOG.md](./CHANGELOG.md) for shipped releases and what's planned next.

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) first. Agent-driven contributors should also read [AGENTS.md](./AGENTS.md). Claude Code users get project-specific guidance in [CLAUDE.md](./CLAUDE.md).

## License

MIT © Contributors. See [LICENSE](./LICENSE).
