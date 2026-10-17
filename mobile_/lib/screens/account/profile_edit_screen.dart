import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../services/api_client.dart';
import '../../theme.dart';
import '../auth/auth_chrome.dart';

class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _secret = TextEditingController();
  final _current = TextEditingController();
  final _birthYear = TextEditingController();
  String? _nameError;
  String? _emailError;
  String? _secretError;
  String? _currentError;
  String? _birthYearError;
  String? _formError;
  bool _busy = false;
  bool _obscure = true;
  bool _obscureCurrent = true;
  String _originalEmail = '';

  bool _seeded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_seeded) return;
    _seeded = true;
    final session = context.read<AuthSession>();
    _name.text = session.displayName ?? '';
    _originalEmail = session.email ?? '';
    _email.text = _originalEmail;
    _name.addListener(_refresh);
    _email.addListener(_refresh);
    _secret.addListener(_refresh);
  }

  void _refresh() => setState(() {});

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _secret.dispose();
    _current.dispose();
    _birthYear.dispose();
    super.dispose();
  }

  bool get _credentialChange =>
      _email.text.trim() != _originalEmail || _secret.text.isNotEmpty;

  Future<void> _save() async {
    final session = context.read<AuthSession>();
    final isTeen = session.isAdultTeen;
    final askBirthYear = !isTeen && session.birthYear == null;
    final name = _name.text.trim();
    final secret = _secret.text;
    final year = _birthYear.text.trim();
    setState(() {
      _formError = null;
      _nameError = name.isEmpty ? 'Name is required' : null;
      _emailError = validateEmail(_email.text);
      if (secret.isEmpty) {
        _secretError = null;
      } else {
        _secretError = validatePassword(secret);
      }
      _currentError = _credentialChange && _current.text.isEmpty
          ? 'Enter your current password'
          : null;
      _birthYearError = !askBirthYear || (year.isEmpty && !session.needsBirthYear)
          ? null
          : validateBirthYear(year, minAge: adultMinAge);
    });
    if ([_nameError, _emailError, _secretError, _currentError, _birthYearError].any((e) => e != null)) {
      return;
    }

    setState(() => _busy = true);
    final current = _credentialChange ? _current.text : null;
    try {
      final synced = await session.updateProfile(
        name: name,
        email: _email.text.trim(),
        password: secret.isEmpty ? null : secret,
        currentPassword: current,
        birthYear: askBirthYear && year.isNotEmpty ? int.parse(year) : null,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            synced
                ? 'Profile updated'
                : 'Saved on this device. Will upload when you are back online.',
          ),
          backgroundColor: AppColors.navy,
        ),
      );
      Navigator.pop(context);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        if (e.statusCode == 403 && _credentialChange) {
          _currentError = e.message;
        } else {
          _formError = e.message;
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _formError = 'Could not save your profile. Try again.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  InputDecoration _fieldDecoration({
    required String label,
    String? hint,
    String? helper,
    String? error,
    Widget? suffix,
    IconData? prefix,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      helperText: helper,
      errorText: error,
      filled: true,
      fillColor: AppColors.cream,
      prefixIcon: prefix == null
          ? null
          : Icon(prefix, size: 20, color: AppColors.textMuted),
      suffixIcon: suffix,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: const TextStyle(
        color: AppColors.textMuted,
        fontWeight: FontWeight.w600,
        fontSize: 14,
      ),
      hintStyle: TextStyle(
        color: AppColors.textMuted.withValues(alpha: 0.7),
        fontWeight: FontWeight.w500,
        fontSize: 14,
      ),
      helperStyle: const TextStyle(
        color: AppColors.textMuted,
        fontWeight: FontWeight.w500,
        fontSize: 12,
        height: 1.3,
      ),
      errorStyle: const TextStyle(
        color: Color(0xFFBA1A1A),
        fontWeight: FontWeight.w600,
        fontSize: 12,
      ),
      border: const OutlineInputBorder(
        borderRadius: AppRadii.cardRadius,
        borderSide: BorderSide(color: AppColors.border),
      ),
      enabledBorder: const OutlineInputBorder(
        borderRadius: AppRadii.cardRadius,
        borderSide: BorderSide(color: AppColors.border),
      ),
      focusedBorder: const OutlineInputBorder(
        borderRadius: AppRadii.cardRadius,
        borderSide: BorderSide(color: AppColors.teal, width: 1.6),
      ),
      errorBorder: const OutlineInputBorder(
        borderRadius: AppRadii.cardRadius,
        borderSide: BorderSide(color: Color(0xFFBA1A1A)),
      ),
      focusedErrorBorder: const OutlineInputBorder(
        borderRadius: AppRadii.cardRadius,
        borderSide: BorderSide(color: Color(0xFFBA1A1A), width: 1.6),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    if (!session.canEditProfile) {
      return Scaffold(
        backgroundColor: AppColors.cream,
        appBar: AppBar(title: const Text('Update profile')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Younger explorers cannot edit their profile from this screen.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      );
    }

    final isTeen = session.isAdultTeen;
    final askBirthYear = !isTeen && session.birthYear == null;
    const secretLabel = 'New password';
    const currentLabel = 'Current password';
    final displayName = _name.text.trim().isEmpty ? 'You' : _name.text.trim();
    final initial = displayName.isEmpty ? '?' : displayName[0].toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        title: const Text('Update profile'),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
              children: [
                _ProfileIdentityHeader(
                  initial: initial,
                  name: displayName,
                  email: _email.text.trim().isEmpty ? _originalEmail : _email.text.trim(),
                ),
                const SizedBox(height: 20),
                if (_formError != null) ...[
                  _FormBanner(message: _formError!),
                  const SizedBox(height: 16),
                ],
                _FormSection(
                  title: 'About you',
                  subtitle: 'How your name appears across the adventure.',
                  children: [
                    TextField(
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.next,
                      decoration: _fieldDecoration(
                        label: 'Name',
                        prefix: Icons.person_outline_rounded,
                        error: _nameError,
                      ),
                    ),
                    if (askBirthYear) ...[
                      const SizedBox(height: 14),
                      TextField(
                        controller: _birthYear,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.next,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(4),
                        ],
                        decoration: _fieldDecoration(
                          label: 'Birth year',
                          hint: 'e.g. 1990',
                          helper: 'Can only be set once',
                          prefix: Icons.cake_outlined,
                          error: _birthYearError,
                        ),
                      ),
                    ],
                    const SizedBox(height: 14),
                    TextField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      textInputAction: TextInputAction.next,
                      decoration: _fieldDecoration(
                        label: 'Email',
                        prefix: Icons.mail_outline_rounded,
                        error: _emailError,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _FormSection(
                  title: 'Sign-in security',
                  subtitle: 'Leave password blank to keep the one you already use.',
                  children: [
                    TextField(
                      controller: _secret,
                      obscureText: _obscure,
                      keyboardType: TextInputType.visiblePassword,
                      textInputAction: TextInputAction.next,
                      decoration: _fieldDecoration(
                        label: secretLabel,
                        hint: 'Optional',
                        prefix: Icons.lock_outline_rounded,
                        error: _secretError,
                        suffix: IconButton(
                          tooltip: _obscure ? 'Show password' : 'Hide password',
                          onPressed: () => setState(() => _obscure = !_obscure),
                          icon: Icon(
                            _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      curve: Curves.easeOut,
                      padding: _credentialChange
                          ? const EdgeInsets.all(12)
                          : EdgeInsets.zero,
                      decoration: BoxDecoration(
                        color: _credentialChange
                            ? AppColors.puzzleTealTint.withValues(alpha: 0.55)
                            : Colors.transparent,
                        borderRadius: AppRadii.cardRadius,
                        border: _credentialChange
                            ? Border.all(color: AppColors.teal.withValues(alpha: 0.25))
                            : null,
                      ),
                      child: TextField(
                        controller: _current,
                        obscureText: _obscureCurrent,
                        keyboardType: TextInputType.visiblePassword,
                        textInputAction: TextInputAction.done,
                        onSubmitted: (_) {
                          if (!_busy) _save();
                        },
                        decoration: _fieldDecoration(
                          label: currentLabel,
                          helper: _credentialChange
                              ? 'Required to confirm your email or password change'
                              : 'Only needed when changing email or password',
                          prefix: Icons.verified_user_outlined,
                          error: _currentError,
                          suffix: IconButton(
                            tooltip: _obscureCurrent ? 'Show password' : 'Hide password',
                            onPressed: () => setState(() => _obscureCurrent = !_obscureCurrent),
                            icon: Icon(
                              _obscureCurrent
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: FilledButton(
                  onPressed: _busy ? null : _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.navy,
                    foregroundColor: AppColors.cream,
                    disabledBackgroundColor: AppColors.navy.withValues(alpha: 0.45),
                    shape: const RoundedRectangleBorder(
                      borderRadius: AppRadii.cardRadius,
                    ),
                    elevation: 0,
                  ),
                  child: Text(
                    _busy ? 'Saving…' : 'Save changes',
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      letterSpacing: -0.1,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileIdentityHeader extends StatelessWidget {
  const _ProfileIdentityHeader({
    required this.initial,
    required this.name,
    required this.email,
  });

  final String initial;
  final String name;
  final String email;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.navy,
            Color(0xFF0A3A5C),
          ],
        ),
        borderRadius: AppRadii.cardRadius,
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(alpha: 0.18),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.orange.withValues(alpha: 0.22),
              border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
            ),
            alignment: Alignment.center,
            child: CircleAvatar(
              radius: 26,
              backgroundColor: AppColors.cream,
              child: Text(
                initial,
                style: const TextStyle(
                  color: AppColors.navy,
                  fontWeight: FontWeight.w800,
                  fontSize: 22,
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.cream,
                    fontWeight: FontWeight.w800,
                    fontSize: 20,
                    letterSpacing: -0.2,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  email.isEmpty ? 'Personal details' : email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.cream.withValues(alpha: 0.72),
                    fontWeight: FontWeight.w500,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FormSection extends StatelessWidget {
  const _FormSection({
    required this.title,
    required this.subtitle,
    required this.children,
  });

  final String title;
  final String subtitle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppRadii.cardRadius,
        border: Border.all(color: AppColors.border.withValues(alpha: 0.7)),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(alpha: 0.04),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppColors.navy,
              fontWeight: FontWeight.w800,
              fontSize: 16,
              letterSpacing: -0.15,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(
              color: AppColors.textMuted,
              fontWeight: FontWeight.w500,
              fontSize: 12.5,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }
}

class _FormBanner extends StatelessWidget {
  const _FormBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFDAD6),
        borderRadius: AppRadii.cardRadius,
        border: Border.all(color: const Color(0xFFBA1A1A).withValues(alpha: 0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline_rounded, color: Color(0xFFBA1A1A), size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: Color(0xFF410E0B),
                fontWeight: FontWeight.w600,
                fontSize: 13,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
