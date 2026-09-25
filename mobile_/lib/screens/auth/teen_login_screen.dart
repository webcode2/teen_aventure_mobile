import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../shared/widgets/demo_account_actions.dart';
import 'auth_chrome.dart';

class TeenLoginScreen extends StatefulWidget {
  const TeenLoginScreen({super.key, this.onAuthenticated, this.initialEmail});

  final VoidCallback? onAuthenticated;
  final String? initialEmail;

  @override
  State<TeenLoginScreen> createState() => _TeenLoginScreenState();
}

class _TeenLoginScreenState extends State<TeenLoginScreen> {
  late final TextEditingController _email;
  final _pin = TextEditingController();
  String? _emailError;
  String? _formError;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _email = TextEditingController(text: widget.initialEmail ?? '');
  }

  @override
  void dispose() {
    _email.dispose();
    _pin.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _emailError = validateEmail(_email.text);
      _formError = validatePin(_pin.text);
    });
    if (_emailError != null || _formError != null) return;

    AuthService auth;
    try {
      auth = context.read<AuthService>();
    } catch (_) {
      widget.onAuthenticated?.call();
      return;
    }
    setState(() => _busy = true);
    try {
      await auth.loginTeenIndependent(email: _email.text.trim(), pin: _pin.text);
      if (!mounted) return;
      await completeAuthFlow(context, onAuthenticated: widget.onAuthenticated);
    } on ApiException catch (e) {
      setState(() => _formError = e.message);
    } catch (e) {
      setState(() => _formError = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _demoTeen() async {
    AuthService auth;
    try {
      auth = context.read<AuthService>();
    } catch (_) {
      widget.onAuthenticated?.call();
      return;
    }
    setState(() => _busy = true);
    try {
      await auth.loginDemoTeenSolo();
      if (!mounted) return;
      await completeAuthFlow(context, onAuthenticated: widget.onAuthenticated);
    } on ApiException catch (e) {
      setState(() => _formError = e.message);
    } catch (e) {
      setState(() => _formError = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthChrome(
      title: 'Teen sign in',
      subtitle:
          'For teen accounts (ages 15+). Use the email and PIN from your parent.',
      showBack: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(labelText: 'Email', errorText: _emailError),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _pin,
            keyboardType: TextInputType.number,
            maxLength: 4,
            obscureText: true,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(labelText: '4-digit PIN', counterText: ''),
          ),
          if (_formError != null) ...[
            const SizedBox(height: 8),
            Text(_formError!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'Signing in…' : 'Sign in'),
          ),
          DemoAccountActions(
            label: 'Account 2 — Teen (solo)',
            hint: 'Riley · teen2@askhub.local · PIN 1234',
            enabled: !_busy,
            onUse: _demoTeen,
          ),
        ],
      ),
    );
  }
}
