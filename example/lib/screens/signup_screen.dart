import 'package:flutter/material.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  static const String route = '/signup';

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  bool _marketing = false;
  bool _submitted = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    super.dispose();
  }

  bool get _isValid =>
      _name.text.trim().isNotEmpty &&
      _email.text.contains('@') &&
      _email.text.contains('.');

  void _submit() {
    if (!_isValid) return;
    setState(() => _submitted = true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Semantics(
          identifier: 'signup-title',
          label: 'Sign up',
          child: const Text('Sign up'),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              identifier: 'signup-name-field',
              label: 'Name',
              textField: true,
              child: TextField(
                controller: _name,
                decoration: const InputDecoration(
                  labelText: 'Name',
                  border: OutlineInputBorder(),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
            const SizedBox(height: 12),
            Semantics(
              identifier: 'signup-email-field',
              label: 'Email',
              textField: true,
              child: TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ),
            const SizedBox(height: 12),
            Semantics(
              identifier: 'signup-marketing-switch',
              label: 'Marketing opt-in',
              toggled: _marketing,
              child: SwitchListTile(
                title: const Text('Send me product updates'),
                value: _marketing,
                onChanged: (v) => setState(() => _marketing = v),
              ),
            ),
            const SizedBox(height: 24),
            Semantics(
              identifier: 'signup-submit',
              label: 'Submit sign up',
              button: true,
              enabled: _isValid,
              child: FilledButton(
                onPressed: _isValid ? _submit : null,
                child: const Text('Submit'),
              ),
            ),
            const SizedBox(height: 16),
            if (_submitted)
              Semantics(
                identifier: 'signup-success',
                label: 'Sign up submitted',
                liveRegion: true,
                child: const Card(
                  color: Color(0xFFE6F4EA),
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Thanks! Your sign-up was submitted.'),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
