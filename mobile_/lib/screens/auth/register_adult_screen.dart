import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../services/service_locator.dart';
import '../../theme.dart';
import '../account/legal_screen.dart';
import 'auth_chrome.dart';

/// Set on adult register; home shows the family dialog once, then clears it.
const offerFamilySetupDialogKey = 'offer_family_setup_dialog';

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
  final _birthYear = TextEditingController();
  late final TapGestureRecognizer _termsTap;
  late final TapGestureRecognizer _privacyTap;
  String? _nameError;
  String? _emailError;
  String? _passwordError;
  String? _birthYearError;
  String? _formError;
  bool _busy = false;
  bool _agreedToTerms = false;

  /// null until a valid birth year is entered.
  int? get _age {
    final year = int.tryParse(_birthYear.text.trim());
    if (year == null || year < 1900 || year > DateTime.now().year) return null;
    return ageFromBirthYear(year);
  }

  bool get _isTeenBand {
    final age = _age;
    return age != null && age >= teenMinAge && age < adultMinAge;
  }

  bool get _isAdultBand {
    final age = _age;
    return age != null && age >= adultMinAge;
  }

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
    _birthYear.dispose();
    _termsTap.dispose();
    _privacyTap.dispose();
    super.dispose();
  }

  void _applyApiError(String message) {
    final lower = message.toLowerCase();
    if (lower.contains('email')) {
      _emailError = message;
    } else if (lower.contains('password')) {
      _passwordError = message;
    } else if (lower.contains('birth') || lower.contains('age') || lower.contains('year')) {
      _birthYearError = message;
    } else if (lower.contains('name')) {
      _nameError = message;
    } else {
      _formError = message;
    }
  }

  String? _validateBirthYearForSignup(String raw) {
    final basic = validateBirthYear(raw, minAge: 0);
    if (basic != null) return basic;
    final age = ageFromBirthYear(int.parse(raw.trim()));
    if (age < teenMinAge) {
      return 'Under $teenMinAge join through a parent’s family account';
    }
    return null;
  }

  Future<void> _submit() async {
    final teen = _isTeenBand;
    final adult = _isAdultBand;
    setState(() {
      _nameError = _name.text.trim().isEmpty ? 'Name is required' : null;
      _emailError = validateEmail(_email.text);
      _birthYearError = _validateBirthYearForSignup(_birthYear.text);
      _passwordError = (teen || adult) ? validatePassword(_password.text) : null;
      _formError = !_agreedToTerms ? 'Please agree to the Terms of Use to continue.' : null;
    });
    if (_nameError != null ||
        _emailError != null ||
        _birthYearError != null ||
        _passwordError != null ||
        _formError != null) {
      return;
    }
    if (!teen && !adult) return;

    AuthService auth;
    try {
      auth = context.read<AuthService>();
    } catch (_) {
      widget.onAuthenticated?.call();
      return;
    }

    final birthYear = int.parse(_birthYear.text.trim());
    setState(() => _busy = true);
    try {
      if (teen) {
        await auth.registerTeen(
          email: _email.text.trim(),
          password: _password.text,
          name: _name.text.trim(),
          birthYear: birthYear,
        );
      } else {
        await auth.registerParent(
          email: _email.text.trim(),
          password: _password.text,
          name: _name.text.trim(),
          birthYear: birthYear,
        );
        await ServiceLocator.instance.prefs.setBool(offerFamilySetupDialogKey, true);
      }
      if (!mounted) return;
      await completeAuthFlow(context, onAuthenticated: widget.onAuthenticated);
    } on ApiException catch (e) {
      setState(() => _applyApiError(e.message));
    } catch (_) {
      setState(() => _formError = 'Could not create your account. Please try again.');
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
    final teen = _isTeenBand;
    final adult = _isAdultBand;
    return AuthChrome(
      title: 'Create account',
      subtitle: teen
          ? 'Ages $teenMinAge–${adultMinAge - 1}: create your own login with email and password. You can join groups; only adults create groups.'
          : adult
              ? 'Ages $adultMinAge+: create a parent or guardian account with email and password.'
              : 'Enter your birth year. Ages $teenMinAge+ use email and password. Under $teenMinAge join through a parent.',
      showBack: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(labelText: 'Your name', errorText: _nameError),
            onChanged: (_) {
              if (_nameError != null) setState(() => _nameError = null);
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _birthYear,
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              LengthLimitingTextInputFormatter(4),
            ],
            decoration: InputDecoration(
              labelText: 'Birth year',
              hintText: teen ? 'e.g. 2010' : 'e.g. 1990',
              errorText: _birthYearError,
            ),
            onChanged: (_) {
              setState(() {
                _birthYearError = null;
                _passwordError = null;
              });
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(labelText: 'Email', errorText: _emailError),
            onChanged: (_) {
              if (_emailError != null) setState(() => _emailError = null);
            },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: InputDecoration(
              labelText: 'Password',
              helperText: 'At least 8 characters',
              errorText: _passwordError,
            ),
            onChanged: (_) {
              if (_passwordError != null) setState(() => _passwordError = null);
            },
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
