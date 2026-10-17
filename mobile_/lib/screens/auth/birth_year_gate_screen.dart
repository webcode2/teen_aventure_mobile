import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../services/api_client.dart';
import 'auth_chrome.dart';

/// Shown to adult accounts created before birth years were collected.
class BirthYearGateScreen extends StatefulWidget {
  const BirthYearGateScreen({super.key});

  @override
  State<BirthYearGateScreen> createState() => _BirthYearGateScreenState();
}

class _BirthYearGateScreenState extends State<BirthYearGateScreen> {
  final _year = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _year.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final error = validateBirthYear(_year.text, minAge: adultMinAge);
    setState(() => _error = error);
    if (error != null) return;

    final session = context.read<AuthSession>();
    setState(() => _busy = true);
    try {
      await session.updateProfile(
        name: session.displayName ?? '',
        email: session.email ?? '',
        birthYear: int.parse(_year.text.trim()),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not save. Check your connection and try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthChrome(
      title: 'One more thing',
      subtitle: 'Add your birth year to keep using your account. It can only be set once.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _year,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(4),
            ],
            decoration: InputDecoration(
              labelText: 'Birth year',
              hintText: 'e.g. 1990',
              errorText: _error,
            ),
            onSubmitted: (_) => _save(),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(_busy ? 'Saving…' : 'Continue'),
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
