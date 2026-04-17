import 'package:flutter/material.dart';

class CounterScreen extends StatefulWidget {
  const CounterScreen({super.key});

  static const String route = '/counter';

  @override
  State<CounterScreen> createState() => _CounterScreenState();
}

class _CounterScreenState extends State<CounterScreen> {
  int _value = 0;

  void _increment() => setState(() => _value++);
  void _decrement() => setState(() => _value--);
  void _reset() => setState(() => _value = 0);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Semantics(
          identifier: 'counter-title',
          label: 'Counter',
          child: const Text('Counter'),
        ),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Semantics(
              identifier: 'counter-value',
              label: 'Current count',
              value: '$_value',
              child: Text('$_value', style: Theme.of(context).textTheme.displayLarge),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Semantics(
                  identifier: 'counter-decrement',
                  label: 'Decrement',
                  button: true,
                  child: IconButton.outlined(
                    icon: const Icon(Icons.remove),
                    onPressed: _decrement,
                  ),
                ),
                const SizedBox(width: 24),
                Semantics(
                  identifier: 'counter-increment',
                  label: 'Increment',
                  button: true,
                  child: IconButton.filled(
                    icon: const Icon(Icons.add),
                    onPressed: _increment,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Semantics(
              identifier: 'counter-reset',
              label: 'Reset counter',
              button: true,
              child: TextButton(onPressed: _reset, child: const Text('Reset')),
            ),
          ],
        ),
      ),
    );
  }
}
