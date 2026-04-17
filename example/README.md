# example

A runnable Flutter sample app used to demonstrate and test `agent-device-flutter` end-to-end.

The app has two screens wired together with well-labeled `Semantics` widgets, so every interactive node gets a stable `@ref` anchor in the agent's snapshot:

- **Counter screen** — increment / decrement / reset a counter
- **Sign-up screen** — fill in name + email, toggle marketing opt-in, submit

## Run the app yourself

```bash
cd example
flutter pub get
flutter run
```

## Drive the app with an agent

From the `example/` directory, with a running device:

```bash
# 1. See what's connected
agent-device-flutter devices

# 2. Build and install a debug version, then open it
flutter build apk --debug
agent-device-flutter open ./build/app/outputs/flutter-apk/app-debug.apk

# 3. Snapshot the home screen
agent-device-flutter snapshot -i

# 4. Replay one of the canned flows
agent-device-flutter replay ./test_flows/counter.adf
agent-device-flutter replay ./test_flows/signup.adf --retries 1

# 5. Audit Semantics coverage on the current screen
agent-device-flutter doctor

# 6. Close the session when done
agent-device-flutter close
```

## What each flow does

### `test_flows/counter.adf`

Opens the app, navigates to the counter screen, presses **Increment** three times, asserts the value, then resets.

### `test_flows/signup.adf`

Opens the app, navigates to the sign-up screen, fills the name and email fields, toggles the marketing opt-in switch, submits, and verifies the success banner.

## Semantics conventions used here

Every interactive widget in `lib/screens/` wraps its child in `Semantics(identifier: '...', label: '...')`. Identifiers are **agent-stable** (snake-case, English, never localized); labels are the human text.

```dart
Semantics(
  identifier: 'counter-increment',
  label: 'Increment',
  button: true,
  child: IconButton(icon: const Icon(Icons.add), onPressed: _increment),
)
```

Run `agent-device-flutter doctor` against this app at any screen and you should see **100% Semantics coverage** with no findings. That is the target every real Flutter app should aim for.
