import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../shared/widgets/demo_account_actions.dart';
import '../shared/widgets/double_back_exit.dart';
import 'auth_chrome.dart';
import 'register_adult_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.onAuthenticated, this.auth});

  final VoidCallback? onAuthenticated;
  final AuthService? auth;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _emailError;
  String? _passwordError;
  String? _formError;
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  AuthService? get _auth {
    if (widget.auth != null) return widget.auth;
    try {
      return context.read<AuthService>();
    } catch (_) {
      return null;
    }
  }

  Future<void> _submit() async {
    setState(() {
      _emailError = validateEmail(_email.text);
      _passwordError = validatePassword(_password.text);
      _formError = null;
    });
    if (_emailError != null || _passwordError != null) return;

    final auth = _auth;
    if (auth == null) {
      widget.onAuthenticated?.call();
      return;
    }

    setState(() => _busy = true);
    try {
      await auth.loginParent(email: _email.text.trim(), password: _password.text);
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

  Future<void> _demoLogin() async {
    final auth = _auth;
    if (auth == null) {
      widget.onAuthenticated?.call();
      return;
    }
    setState(() => _busy = true);
    try {
      await auth.loginDemoParent();
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

  Future<void> _demoTeenSolo() async {
    final auth = _auth;
    if (auth == null) {
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
    return DoubleBackExit(
      child: AuthChrome(
        title: 'Sign in',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              key: const Key('email-field'),
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: 'Email',
                errorText: _emailError,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              key: const Key('password-field'),
              controller: _password,
              obscureText: true,
              decoration: InputDecoration(
                labelText: 'Password',
                errorText: _passwordError,
              ),
            ),
            if (_formError != null) ...[
              const SizedBox(height: 8),
              Text(_formError!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: Text(_busy ? 'Signing in…' : 'Sign in'),
            ),
            TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => RegisterAdultScreen(
                      onAuthenticated: widget.onAuthenticated,
                    ),
                  ),
                );
              },
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
              child: const Text('Create account'),
            ),
            DemoAccountActions(
              label: 'Account 1 — Adult with family',
              hint: 'Pat Peterson + teen subaccounts',
              enabled: !_busy,
              onUse: _demoLogin,
            ),
            DemoAccountActions(
              label: 'Account 2 — Teen (solo)',
              hint: 'Riley · no subaccounts attached',
              enabled: !_busy,
              onUse: _demoTeenSolo,
            ),
          ],
        ),
      ),
    );
  }
}
