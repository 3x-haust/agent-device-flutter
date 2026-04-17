import 'package:flutter/material.dart';

import 'screens/counter_screen.dart';
import 'screens/signup_screen.dart';

class ExampleApp extends StatelessWidget {
  const ExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'agent-device-flutter example',
      theme: ThemeData(
        colorSchemeSeed: Colors.blue,
        useMaterial3: true,
      ),
      home: const HomeScreen(),
      routes: {
        CounterScreen.route: (_) => const CounterScreen(),
        SignupScreen.route: (_) => const SignupScreen(),
      },
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Semantics(
          identifier: 'home-title',
          label: 'Home',
          child: const Text('Home'),
        ),
      ),
      body: Center(
        child: Semantics(
          identifier: 'home-menu',
          label: 'Home menu',
          container: true,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Semantics(
                identifier: 'nav-to-counter',
                label: 'Open counter',
                button: true,
                child: FilledButton(
                  onPressed: () => Navigator.pushNamed(context, CounterScreen.route),
                  child: const Text('Counter'),
                ),
              ),
              const SizedBox(height: 16),
              Semantics(
                identifier: 'nav-to-signup',
                label: 'Open sign up',
                button: true,
                child: FilledButton.tonal(
                  onPressed: () => Navigator.pushNamed(context, SignupScreen.route),
                  child: const Text('Sign up'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
