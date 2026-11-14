import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../family/family_account_rules.dart';
import '../../services/auth_service.dart';
import '../../services/error_text.dart';
import '../../services/family_service.dart';
import '../../theme.dart';
import '../auth/auth_chrome.dart';

InputDecoration _decoration(String label, {Widget? suffix}) => InputDecoration(
      labelText: label,
      counterText: '',
      filled: true,
      fillColor: Colors.white,
      suffixIcon: suffix,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.border),
      ),
    );

/// Returns an error when the two PIN entries are not one valid 4-digit PIN.
String? validatePinPair(String pin, String confirm) {
  return validatePin(pin) ?? (pin == confirm ? null : 'The PINs do not match');
}

/// PIN + confirm fields. The person creating the explorer types the PIN; it is never generated.
class _PinFields extends StatefulWidget {
  const _PinFields({required this.pin, required this.confirm});

  final TextEditingController pin;
  final TextEditingController confirm;

  @override
  State<_PinFields> createState() => _PinFieldsState();
}

class _PinFieldsState extends State<_PinFields> {
  bool _visible = false;

  Widget _field(TextEditingController controller, String label, {String? Function(String?)? validator}) {
    return TextFormField(
      controller: controller,
      keyboardType: TextInputType.number,
      maxLength: 4,
      obscureText: !_visible,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      validator: validator,
      decoration: _decoration(
        label,
        suffix: IconButton(
          tooltip: _visible ? 'Hide PIN' : 'Show PIN',
          onPressed: () => setState(() => _visible = !_visible),
          icon: Icon(_visible ? Icons.visibility_off : Icons.visibility),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _field(widget.pin, '4-digit PIN', validator: (v) => validatePin(v ?? '')),
        const SizedBox(height: 12),
        _field(
          widget.confirm,
          'Confirm PIN',
          validator: (v) => validatePinPair(widget.pin.text, v ?? ''),
        ),
      ],
    );
  }
}

/// Full-screen form for adding an explorer to the family.
class AddExplorerScreen extends StatefulWidget {
  const AddExplorerScreen({super.key, this.beforeAdd});

  /// Runs before the explorer is saved (e.g. creating the family on first use).
  final Future<void> Function()? beforeAdd;

  @override
  State<AddExplorerScreen> createState() => _AddExplorerScreenState();
}

class _AddExplorerScreenState extends State<AddExplorerScreen> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _age = TextEditingController();
  final _pin = TextEditingController();
  final _confirm = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_name, _age, _pin, _confirm, _email, _password]) {
      c.dispose();
    }
    super.dispose();
  }

  ExplorerAgeKind? get _kind {
    final age = int.tryParse(_age.text.trim());
    return age == null ? null : explorerKindFromAge(age);
  }

  Future<void> _save() async {
    if (_form.currentState?.validate() != true) return;
    final kind = _kind!;
    final email = _email.text.trim();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.beforeAdd?.call();
      if (!mounted) return;
      await context.read<FamilyService>().addChild(
            name: _name.text.trim(),
            birthYear: DateTime.now().year - int.parse(_age.text.trim()),
            pin: kind == ExplorerAgeKind.child ? _pin.text : null,
            email: kind == ExplorerAgeKind.teen && email.isNotEmpty ? email : null,
            password: kind == ExplorerAgeKind.teen && email.isNotEmpty ? _password.text : null,
          );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final kind = _kind;
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: const Text('Add explorer', style: TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              TextFormField(
                key: const ValueKey('explorer-name'),
                controller: _name,
                textCapitalization: TextCapitalization.words,
                validator: (v) => (v ?? '').trim().isEmpty ? 'Enter a name for this explorer' : null,
                decoration: _decoration('Name'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                key: const ValueKey('explorer-age'),
                controller: _age,
                keyboardType: TextInputType.number,
                maxLength: 2,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                onChanged: (_) => setState(() {}),
                validator: (_) => _kind == null ? explorerAgeHint : null,
                decoration: _decoration('Age'),
              ),
              if (kind == ExplorerAgeKind.child) ...[
                const SizedBox(height: 8),
                const Text(
                  'Choose a PIN. Your explorer uses it to open their profile on this device.',
                  style: TextStyle(color: AppColors.textSecondary, height: 1.35),
                ),
                const SizedBox(height: 12),
                _PinFields(pin: _pin, confirm: _confirm),
              ],
              if (kind == ExplorerAgeKind.teen) ...[
                const SizedBox(height: 8),
                const Text(
                  'Optional: give them their own login. Leave blank to manage them from your account.',
                  style: TextStyle(color: AppColors.textSecondary, height: 1.35),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) => (v ?? '').trim().isEmpty ? null : validateEmail(v!),
                  decoration: _decoration('Email (optional)'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _password,
                  obscureText: true,
                  validator: (v) => _email.text.trim().isEmpty ? null : validatePassword(v ?? ''),
                  decoration: _decoration('Password'),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 20),
              FilledButton(
                key: const ValueKey('save-explorer'),
                onPressed: _busy ? null : _save,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.navy,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: Text(_busy ? 'Adding…' : 'Add explorer'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Full-screen form for changing an under-15 explorer's PIN.
class ExplorerPinScreen extends StatefulWidget {
  const ExplorerPinScreen({super.key, required this.childId, required this.childName});

  final String childId;
  final String childName;

  @override
  State<ExplorerPinScreen> createState() => _ExplorerPinScreenState();
}

class _ExplorerPinScreenState extends State<ExplorerPinScreen> {
  final _form = GlobalKey<FormState>();
  final _pin = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _pin.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_form.currentState?.validate() != true) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AuthService>().setChildPin(
            childId: widget.childId,
            pin: _pin.text,
            familyId: context.read<FamilyService>().familyId,
          );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: Text('PIN for ${widget.childName}', style: const TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: SafeArea(
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              _PinFields(pin: _pin, confirm: _confirm),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _busy ? null : _save,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.navy,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: Text(_busy ? 'Saving…' : 'Save PIN'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
