import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../theme.dart';
import 'auth_chrome.dart';
import '../../services/error_text.dart';

/// Switch into a family teen who has independent login.
/// Signs them in with email/password and ends the parent session on this device.
class ChildTeenLoginScreen extends StatefulWidget {
  const ChildTeenLoginScreen({
    super.key,
    required this.childId,
    this.childName,
    this.email,
    this.onAuthenticated,
  });

  final String childId;
  final String? childName;
  final String? email;
  final VoidCallback? onAuthenticated;

  @override
  State<ChildTeenLoginScreen> createState() => _ChildTeenLoginScreenState();
}

class _ChildTeenLoginScreenState extends State<ChildTeenLoginScreen> {
  late final TextEditingController _email;
  final _password = TextEditingController();
  String? _emailError;
  String? _passwordError;
  String? _formError;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _email = TextEditingController(text: widget.email?.trim() ?? '');
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _emailError = validateEmail(_email.text);
      _passwordError = validatePassword(_password.text);
      _formError = null;
    });
    if (_emailError != null || _passwordError != null) return;

    AuthService auth;
    try {
      auth = context.read<AuthService>();
    } catch (_) {
      widget.onAuthenticated?.call();
      return;
    }

    setState(() => _busy = true);
    try {
      final session = context.read<AuthSession>();
      if (!session.isParent) {
        setState(() {
          _busy = false;
          _formError = 'A parent must be signed in to open this profile.';
        });
        return;
      }

      await auth.loginTeenReplacingParent(
        email: _email.text.trim(),
        password: _password.text,
        expectedChildId: widget.childId,
      );

      if (!mounted) return;
      await completeAuthFlow(context, onAuthenticated: widget.onAuthenticated);
    } on ApiException catch (e) {
      setState(() => _formError = e.message);
    } catch (e) {
      setState(() => _formError = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = widget.childName?.trim();
    return AuthChrome(
      title: name == null || name.isEmpty ? 'Sign in' : 'Hi, $name',
      subtitle: 'Sign in with your email and password. The parent account will sign out on this phone.',
      showBack: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            decoration: InputDecoration(
              labelText: 'Email',
              errorText: _emailError,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            obscureText: true,
            autofocus: (widget.email?.trim().isNotEmpty ?? false),
            autofillHints: const [AutofillHints.password],
            decoration: InputDecoration(
              labelText: 'Password',
              errorText: _passwordError,
            ),
          ),
          if (_formError != null) ...[
            const SizedBox(height: 8),
            Text(
              _formError!,
              style: const TextStyle(
                color: AppColors.orange,
                fontWeight: FontWeight.w600,
                height: 1.3,
              ),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'Signing in…' : 'Sign in'),
          ),
        ],
      ),
    );
  }
}
