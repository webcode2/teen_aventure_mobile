import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../services/api_client.dart';
import 'auth_chrome.dart';

/// Pastor-created teachers must replace the temporary password before using the app.
class ForcePasswordChangeScreen extends StatefulWidget {
  const ForcePasswordChangeScreen({super.key});

  @override
  State<ForcePasswordChangeScreen> createState() =>
      _ForcePasswordChangeScreenState();
}

class _ForcePasswordChangeScreenState extends State<ForcePasswordChangeScreen> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;
  bool _busy = false;
  bool _obscure = true;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final current = _current.text;
    final next = _next.text;
    final confirm = _confirm.text;

    String? error;
    if (current.isEmpty) {
      error = 'Enter the temporary password from your ministry lead.';
    } else if (next.length < 8) {
      error = 'New password must be at least 8 characters.';
    } else if (next == current) {
      error = 'Choose a new password that is different from the temporary one.';
    } else if (next != confirm) {
      error = 'New password and confirmation do not match.';
    }

    setState(() => _error = error);
    if (error != null) return;

    final session = context.read<AuthSession>();
    setState(() => _busy = true);
    try {
      await session.updateProfile(
        name: session.displayName ?? '',
        email: session.email ?? '',
        password: next,
        currentPassword: current,
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() =>
            _error = 'Could not save. Check your connection and try again.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthChrome(
      title: 'Choose your password',
      subtitle:
          'Your ministry lead set a temporary password. Pick one only you know before continuing.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _current,
            obscureText: _obscure,
            autofillHints: const [AutofillHints.password],
            decoration: const InputDecoration(
              labelText: 'Temporary password',
            ),
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _next,
            obscureText: _obscure,
            autofillHints: const [AutofillHints.newPassword],
            decoration: InputDecoration(
              labelText: 'New password',
              helperText: 'At least 8 characters',
              suffixIcon: IconButton(
                onPressed: () => setState(() => _obscure = !_obscure),
                icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                tooltip: _obscure ? 'Show passwords' : 'Hide passwords',
              ),
            ),
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _confirm,
            obscureText: _obscure,
            autofillHints: const [AutofillHints.newPassword],
            decoration: InputDecoration(
              labelText: 'Confirm new password',
              errorText: _error,
            ),
            onSubmitted: (_) => _save(),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(_busy ? 'Saving…' : 'Save and continue'),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: _busy ? null : () => context.read<AuthSession>().logout(),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}
