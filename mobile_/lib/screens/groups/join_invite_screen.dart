import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../family/family_account_rules.dart';
import '../../join_payload.dart';
import '../../models/auth_session.dart';
import '../../platform/invite_qr_scanner.dart';
import '../../services/api_client.dart';
import '../../services/family_service.dart';
import '../../theme.dart';

class JoinInviteScreen extends StatefulWidget {
  const JoinInviteScreen({super.key, this.showScanner = true});

  /// When false (e.g. widget tests), skip the live camera.
  final bool showScanner;

  @override
  State<JoinInviteScreen> createState() => _JoinInviteScreenState();
}

class _JoinInviteScreenState extends State<JoinInviteScreen>
    with WidgetsBindingObserver {
  final _token = TextEditingController();
  InviteQrScannerController? _scanner;
  Map<String, dynamic>? _preview;
  String? _error;
  bool _busy = false;
  bool _handlingScan = false;
  bool _showPaste = false;
  bool _torchOn = false;

  bool get _useScanner =>
      widget.showScanner && inviteQrScannerSupported && _scanner != null;

  bool get _canAcceptIndependently {
    try {
      return canIndependentlyAcceptInvite(
        isUnderAgeExplorer: context.read<AuthSession>().isUnderAgeExplorer,
      );
    } catch (_) {
      return true;
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (widget.showScanner && inviteQrScannerSupported) {
      _scanner = createInviteQrScannerController();
    }
    _showPaste = !_useScanner;
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _scanner?.dispose();
    _token.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final controller = _scanner;
    if (controller == null || !_useScanner) return;
    switch (state) {
      case AppLifecycleState.resumed:
        controller.start();
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        controller.stop();
    }
  }

  Future<void> _previewInvite([String? rawOverride]) async {
    if (!_canAcceptIndependently) {
      setState(() => _error = 'Ask a parent to accept this invite from their account.');
      return;
    }
    final raw = (rawOverride ?? _token.text).trim();
    final token = parseJoinToken(raw);
    if (token == null || token.isEmpty) {
      setState(() => _error = 'That invite code looks empty. Scan again or paste the code.');
      return;
    }
    _token.text = encodeJoinToken(token);
    setState(() {
      _busy = true;
      _error = null;
      _preview = null;
    });
    final family = context.read<FamilyService>();
    try {
      final preview = await family.previewInvite(token);
      if (!mounted) return;
      setState(() => _preview = preview);
      await _scanner?.stop();
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _error = e.message);
        _handlingScan = false;
        await _scanner?.start();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = '$e');
        _handlingScan = false;
        await _scanner?.start();
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _accept() async {
    if (!_canAcceptIndependently) {
      setState(() => _error = 'Ask a parent to accept this invite from their account.');
      return;
    }
    final token = parseJoinToken(_token.text.trim());
    if (token == null || token.isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final family = context.read<FamilyService>();
    final session = context.read<AuthSession>();
    try {
      await family.acceptInvite(token);
      await session.refreshProfile();
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      Navigator.pop(context, true);
      messenger.showSnackBar(
        const SnackBar(
          content: Text('You joined. Welcome in.'),
          backgroundColor: AppColors.navy,
        ),
      );
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _onDetect(String raw) {
    if (_handlingScan || _busy || _preview != null) return;
    _handlingScan = true;
    _previewInvite(raw);
  }

  Future<void> _rescan() async {
    setState(() {
      _preview = null;
      _error = null;
      _handlingScan = false;
      _token.clear();
    });
    await _scanner?.start();
  }

  Future<void> _toggleTorch() async {
    await _scanner?.toggleTorch();
    setState(() => _torchOn = _scanner?.torchOn ?? false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: const Text('Join with invite', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          if (_useScanner)
            IconButton(
              tooltip: _torchOn ? 'Torch off' : 'Torch on',
              onPressed: _toggleTorch,
              icon: Icon(_torchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded),
            ),
        ],
      ),
      body: !_canAcceptIndependently
          ? const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Your parent accepts group invites from their account. You cannot join independently.',
                style: TextStyle(color: AppColors.navy, fontWeight: FontWeight.w700, height: 1.35),
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
              children: [
                Text(
                  _useScanner
                      ? 'Point your camera at the invite QR. We check it automatically.'
                      : inviteQrScannerSupported
                          ? 'Paste the invite you received.'
                          : 'Paste the invite code. Live QR scanning is available in the Android/iOS app.',
                  style: const TextStyle(color: AppColors.textMuted, height: 1.35),
                ),
                if (widget.showScanner) ...[
                  const SizedBox(height: 14),
                  buildInviteQrScanner(
                    controller: _scanner,
                    onDetect: _onDetect,
                    busy: _busy,
                    paused: _preview != null,
                  ),
                  if (_busy && _useScanner) ...[
                    const SizedBox(height: 12),
                    const Row(
                      children: [
                        SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        SizedBox(width: 10),
                        Text(
                          'Checking invite…',
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            color: AppColors.navy,
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (_useScanner) ...[
                    const SizedBox(height: 12),
                    TextButton.icon(
                      onPressed: () => setState(() => _showPaste = !_showPaste),
                      icon: Icon(
                        _showPaste ? Icons.keyboard_hide_rounded : Icons.keyboard_rounded,
                        size: 18,
                      ),
                      label: Text(_showPaste ? 'Hide paste code' : 'Paste code instead'),
                    ),
                  ],
                ],
                if (_showPaste || !_useScanner) ...[
                  const SizedBox(height: 8),
                  TextField(
                    controller: _token,
                    minLines: 1,
                    maxLines: 3,
                    decoration: InputDecoration(
                      labelText: 'Invite code',
                      hintText: 'tba-join:…',
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: _busy ? null : () => _previewInvite(),
                    child: Text(_busy ? 'Checking…' : 'Check invite'),
                  ),
                ],
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: Color(0xFFBA1A1A))),
                  if (_useScanner) ...[
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: _busy ? null : _rescan,
                      child: const Text('Scan again'),
                    ),
                  ],
                ],
                if (_preview != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: AppRadii.cardRadius,
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          _preview!['name'] as String? ?? 'Invite',
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 18,
                            color: AppColors.navy,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          joinKindLabel(_preview!['kind'] as String? ?? ''),
                          style: const TextStyle(color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _busy ? null : _accept,
                          style: FilledButton.styleFrom(backgroundColor: AppColors.navy),
                          child: const Text('Accept invite'),
                        ),
                        if (_useScanner)
                          TextButton(
                            onPressed: _busy ? null : _rescan,
                            child: const Text('Scan a different code'),
                          ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
    );
  }
}
