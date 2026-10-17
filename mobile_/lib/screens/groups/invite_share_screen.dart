import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import '../../join_payload.dart';
import '../../services/api_client.dart';
import '../../services/family_service.dart';
import '../../theme.dart';

class InviteShareScreen extends StatefulWidget {
  const InviteShareScreen({
    super.key,
    required this.kind,
    this.familyId,
    this.churchId,
    this.classId,
    this.joinCode,
    this.groupName,
  });

  final String kind;
  final String? familyId;
  final String? churchId;
  final String? classId;
  /// Durable group/ministry code for a permanent QR (not a one-time invite token).
  final String? joinCode;
  final String? groupName;

  @override
  State<InviteShareScreen> createState() => _InviteShareScreenState();
}

class _InviteShareScreenState extends State<InviteShareScreen> {
  final _email = TextEditingController();
  final _durableQrKey = GlobalKey();
  final _inviteQrKey = GlobalKey();
  Map<String, dynamic>? _invite;
  String? _error;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _create();
    });
  }

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final invite = await context.read<FamilyService>().createInvite(
            kind: widget.kind,
            familyId: widget.familyId,
            churchId: widget.churchId,
            classId: widget.classId,
            email: _email.text.trim().isEmpty ? null : _email.text.trim(),
          );
      if (mounted) {
        setState(() => _invite = invite);
        if (invite['email'] != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Invite emailed to ${invite['email']}'),
              backgroundColor: AppColors.navy,
            ),
          );
        }
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _copy(String payload) async {
    await Clipboard.setData(ClipboardData(text: payload));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Invite copied'), backgroundColor: AppColors.navy),
    );
  }

  Future<void> _shareQr(String payload, {required GlobalKey qrKey}) async {
    if (kIsWeb) {
      await Share.share(payload);
      return;
    }
    final boundary = qrKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary == null) {
      await Share.share(payload);
      return;
    }
    final image = await boundary.toImage(pixelRatio: 3);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    if (bytes == null) {
      await Share.share(payload);
      return;
    }
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/tba-invite.png');
    await file.writeAsBytes(bytes.buffer.asUint8List());
    await Share.shareXFiles(
      [XFile(file.path, mimeType: 'image/png')],
      text: payload,
    );
  }

  String? get _durablePayload {
    final code = widget.joinCode?.trim();
    if (code == null || code.isEmpty) return null;
    final kind = widget.kind.toUpperCase();
    if (kind == 'CHURCH') return encodeChurchJoinCode(code);
    if (kind == 'CLASS' || kind == 'CUSTOM') return encodeClassJoinCode(code);
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final payload = _invite?['payload'] as String? ?? '';
    final durable = _durablePayload;
    final titleName = widget.groupName?.trim().isNotEmpty == true
        ? widget.groupName!.trim()
        : joinKindLabel(widget.kind).toLowerCase();
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: Text(
          'Share $titleName',
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (durable != null) ...[
            const Text(
              'Group join pass',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
            ),
            const SizedBox(height: 6),
            const Text(
              'Anyone can scan this QR or enter the group code. It stays valid until you regenerate the code.',
              style: TextStyle(color: AppColors.textMuted, height: 1.35),
            ),
            const SizedBox(height: 16),
            Center(
              child: RepaintBoundary(
                key: _durableQrKey,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.white,
                  child: QrImageView(
                    data: durable,
                    size: 200,
                    backgroundColor: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            SelectableText(
              'JOIN CODE: ${normalizeJoinCode(widget.joinCode!)}',
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppColors.navy),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () => _shareQr(durable, qrKey: _durableQrKey),
              icon: const Icon(Icons.ios_share_rounded),
              label: const Text('Share QR image'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => _copy(normalizeJoinCode(widget.joinCode!)),
              icon: const Icon(Icons.copy_rounded),
              label: const Text('Copy group code'),
            ),
            const SizedBox(height: 28),
            const Divider(),
            const SizedBox(height: 12),
            const Text(
              'One-time email invite (optional)',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.navy),
            ),
            const SizedBox(height: 6),
          ],
          Text(
            durable == null
                ? 'Share the QR as an image in any messenger, or copy the code.'
                : 'Or send a private invite link that expires in 14 days.',
            style: const TextStyle(color: AppColors.textMuted, height: 1.35),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: InputDecoration(
              labelText: 'Email (optional)',
              filled: true,
              fillColor: Colors.white,
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.border)),
              enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: AppColors.border)),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _busy ? null : _create,
            child: Text(_busy ? 'Creating…' : durable == null ? 'Refresh invite' : 'Create email invite'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Color(0xFFBA1A1A))),
          ],
          if (payload.isNotEmpty) ...[
            const SizedBox(height: 24),
            Center(
              child: RepaintBoundary(
                key: _inviteQrKey,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.white,
                  child: QrImageView(
                    data: payload,
                    size: durable == null ? 200 : 160,
                    backgroundColor: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            SelectableText(
              payload,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.navy),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: () => _shareQr(payload, qrKey: _inviteQrKey),
              icon: const Icon(Icons.ios_share_rounded),
              label: const Text('Share invite QR'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: () => _copy(payload),
              icon: const Icon(Icons.copy_rounded),
              label: const Text('Copy invite'),
            ),
          ],
        ],
      ),
    );
  }
}
