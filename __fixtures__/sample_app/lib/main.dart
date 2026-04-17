import 'package:flutter/material.dart';

void main() {
  runApp(const SampleApp());
}

class SampleApp extends StatelessWidget {
  const SampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sample',
      home: Semantics(
        identifier: 'home-screen',
        label: 'Home',
        child: const Scaffold(body: Center(child: Text('hello'))),
      ),
    );
  }
}
