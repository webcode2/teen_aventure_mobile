import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_client.dart';
import '../../services/family_service.dart';
import '../../theme.dart';

class AccountDeletionScreen extends StatefulWidget {
  const AccountDeletionScreen({super.key});

  @override
  State<AccountDeletionScreen> createState() => _AccountDeletionScreenState();
}

class _AccountDeletionScreenState extends State<AccountDeletionScreen> {
  bool _busy = false;
  String? _error;
  String? _stage;

  @override
  void initState() {
    super.initState();
    _refreshStage();
  }

  Future<void> _refreshStage() async {
    try {
      final family = await context.read<FamilyService>().getMyFamily();
      if (!mounted) return;
      setState(() => _stage = family['deletionStage'] as String?);
    } catch (_) {}
  }

  Future<void> _request() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<FamilyService>().requestDeletion();
      if (!mounted) return;
      await _refreshStage();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _restore() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<FamilyService>().cancelDeletion();
      if (!mounted) return;
      await _refreshStage();
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(title: const Text('Delete family account')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Text(
            'Requesting deletion immediately removes family-side visibility.',
            style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
          ),
          SizedBox(height: 12),
          Text('0–30 days: recoverable.'),
          Text('30–90 days: backend-only.'),
          Text('90+ days: permanent purge according to the approved lifecycle.'),
          SizedBox(height: 12),
          Text(
            'Safeguarding investigations may extend retention until the investigation closes. '
            'Retention periods are global product rules, not publisher-configurable settings.',
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
              if (_stage == 'recoverable')
                OutlinedButton(
                  onPressed: _busy ? null : _restore,
                  child: Text(_busy ? 'Restoring…' : 'Restore family (0–30 days)'),
                )
              else
                FilledButton(
                  onPressed: _busy ? null : _request,
                  child: Text(_busy ? 'Submitting…' : 'Request deletion'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
