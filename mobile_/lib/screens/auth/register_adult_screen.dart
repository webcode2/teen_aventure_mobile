import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../theme.dart';
import '../account/legal_screen.dart';
import 'auth_chrome.dart';

class RegisterAdultScreen extends StatefulWidget {
  const RegisterAdultScreen({super.key, this.onAuthenticated});

  final VoidCallback? onAuthenticated;

  @override
  State<RegisterAdultScreen> createState() => _RegisterAdultScreenState();
}

class _RegisterAdultScreenState extends State<RegisterAdultScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  late final TapGestureRecognizer _termsTap;
  late final TapGestureRecognizer _privacyTap;
  String? _emailError;
  String? _passwordError;
  String? _formError;
  bool _busy = false;
  bool _agreedToTerms = false;

  @override
  void initState() {
    super.initState();
    _termsTap = TapGestureRecognizer()..onTap = _openTerms;
    _privacyTap = TapGestureRecognizer()..onTap = _openPrivacy;
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _termsTap.dispose();
    _privacyTap.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _emailError = validateEmail(_email.text);
      _passwordError = validatePassword(_password.text);
      _formError = null;
    });
    if (_name.text.trim().isEmpty) {
      setState(() => _formError = 'Name is required');
      return;
    }
    if (!_agreedToTerms) {
      setState(() => _formError = 'Please agree to the Terms of Use to continue.');
      return;
    }
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
      await auth.registerParent(
        email: _email.text.trim(),
        password: _password.text,
        name: _name.text.trim(),
      );
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

  void _openTerms() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const LegalScreen(doc: LegalDoc.terms)),
    );
  }

  void _openPrivacy() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const LegalScreen(doc: LegalDoc.privacy)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AuthChrome(
      title: 'Create account',
      showBack: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(labelText: 'Your name'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(labelText: 'Email', errorText: _emailError),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: InputDecoration(labelText: 'Password', errorText: _passwordError),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 24,
                height: 24,
                child: Checkbox(
                  value: _agreedToTerms,
                  activeColor: AppColors.navy,
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                  onChanged: (v) => setState(() {
                    _agreedToTerms = v ?? false;
                    if (_agreedToTerms && _formError != null) _formError = null;
                  }),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text.rich(
                    TextSpan(
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 13,
                        height: 1.4,
                        fontWeight: FontWeight.w600,
                      ),
                      children: [
                        const TextSpan(text: 'I agree to the '),
                        TextSpan(
                          text: 'Terms of Use',
                          style: const TextStyle(
                            color: AppColors.navy,
                            fontWeight: FontWeight.w800,
                            decoration: TextDecoration.underline,
                          ),
                          recognizer: _termsTap,
                        ),
                        const TextSpan(text: ' and '),
                        TextSpan(
                          text: 'Privacy Policy',
                          style: const TextStyle(
                            color: AppColors.navy,
                            fontWeight: FontWeight.w800,
                            decoration: TextDecoration.underline,
                          ),
                          recognizer: _privacyTap,
                        ),
                        const TextSpan(text: '.'),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (_formError != null) ...[
            const SizedBox(height: 8),
            Text(_formError!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'Creating…' : 'Create account'),
          ),
        ],
      ),
    );
  }
}
