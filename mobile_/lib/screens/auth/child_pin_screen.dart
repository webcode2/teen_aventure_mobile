import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../theme.dart';
import 'auth_chrome.dart';
import '../../services/error_text.dart';

class ChildPinScreen extends StatefulWidget {
  const ChildPinScreen({
    super.key,
    this.onAuthenticated,
    this.childId,
    this.childName,
    this.useParentSwitch = false,
  });

  final VoidCallback? onAuthenticated;
  final String? childId;
  final String? childName;
  /// 0–14: parent JWT + existing `/families/children/:id/switch` (not unauthenticated child-pin).
  final bool useParentSwitch;

  @override
  State<ChildPinScreen> createState() => _ChildPinScreenState();
}

class _ChildPinScreenState extends State<ChildPinScreen> {
  final _pin = TextEditingController();
  String? _formError;
  bool _busy = false;

  @override
  void dispose() {
    _pin.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final childId = widget.childId?.trim() ?? '';
    if (childId.isEmpty) {
      setState(() => _formError = 'Choose a profile first');
      return;
    }
    final pinError = validatePin(_pin.text);
    if (pinError != null) {
      setState(() => _formError = pinError);
      return;
    }
    AuthService auth;
    try {
      auth = context.read<AuthService>();
    } catch (_) {
      widget.onAuthenticated?.call();
      return;
    }
    setState(() {
      _busy = true;
      _formError = null;
    });
    try {
      final session = context.read<AuthSession>();
      if (!session.isParent) {
        setState(() {
          _busy = false;
          _formError = widget.useParentSwitch
              ? 'A parent must be signed in to open this profile.'
              : 'Sign in with your email and password instead.';
        });
        return;
      }
      // Prefer PIN verification (stashes parent token). Under-age profiles with no
      // PIN yet fall back to the parent switch endpoint.
      try {
        await auth.loginChildPin(childId: childId, pin: _pin.text);
      } on ApiException catch (e) {
        // Under-age profiles may not have a PIN yet — only then use the switch route.
        final noPin = widget.useParentSwitch &&
            e.message.toLowerCase().contains('pin not set');
        if (!noPin) rethrow;
        await session.switchToUnderageChild(childId);
        if (!mounted) return;
        widget.onAuthenticated?.call();
        if (Navigator.of(context).canPop()) {
          Navigator.of(context).popUntil((route) => route.isFirst);
        }
        return;
      }
      if (!mounted) return;
      await session.afterLogin();
      widget.onAuthenticated?.call();
      if (mounted && Navigator.of(context).canPop()) {
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
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
      title: name == null || name.isEmpty ? 'Enter PIN' : 'Hi, $name',
      subtitle: 'Enter your PIN to continue.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: _pin,
            keyboardType: TextInputType.number,
            maxLength: 4,
            obscureText: true,
            autofocus: true,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(labelText: '4-digit PIN', counterText: ''),
          ),
          if (_formError != null) ...[
            const SizedBox(height: 8),
            Text(
              _formError!,
              style: const TextStyle(color: AppColors.orange, fontWeight: FontWeight.w600, height: 1.3),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'Signing in…' : 'Continue'),
          ),
        ],
      ),
    );
  }
}
