import 'package:flutter/material.dart';
import '../../providers/cms_text.dart';
import '../../services/auth_service.dart';
import '../../services/service_locator.dart';
import '../../theme.dart';
import '../../services/error_text.dart';

/// Lists FCM-registered devices for the signed-in account and lets the user remove them.
class DevicesScreen extends StatefulWidget {
  const DevicesScreen({super.key});

  @override
  State<DevicesScreen> createState() => _DevicesScreenState();
}

class _DevicesScreenState extends State<DevicesScreen> {
  List<AccountDevice> _devices = const [];
  bool _loading = true;
  String? _error;
  String? _removingId;
  String? _currentToken;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final push = ServiceLocator.instance.pushService;
      _currentToken = await push.currentToken();
      final devices = await ServiceLocator.instance.authService.listDevices(
        currentToken: _currentToken,
      );
      if (!mounted) return;
      setState(() {
        _devices = devices;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = errorText(e, fallback: 'Could not load devices');
      });
    }
  }

  Future<void> _remove(AccountDevice device) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(device.isCurrent ? 'Remove this phone?' : 'Remove device?'),
        content: Text(
          device.isCurrent
              ? 'This phone will stop receiving notifications until you sign in again.'
              : 'That device will be signed out and stop receiving notifications for this account.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _removingId = device.id);
    try {
      await ServiceLocator.instance.authService.removeDevice(device.id);
      if (device.isCurrent) {
        await ServiceLocator.instance.pushService.revokeLocalRegistration();
      }
      if (!mounted) return;
      setState(() {
        _devices = _devices.where((d) => d.id != device.id).toList();
        _removingId = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Device removed')),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _removingId = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(errorText(e, fallback: 'Could not remove device'))),
      );
    }
  }

  String _platformLabel(String platform) {
    switch (platform.toLowerCase()) {
      case 'ios':
        return 'iPhone / iPad';
      case 'android':
        return 'Android';
      case 'web':
        return 'Web';
      default:
        return platform;
    }
  }

  IconData _platformIcon(String platform) {
    switch (platform.toLowerCase()) {
      case 'ios':
        return Icons.phone_iphone_rounded;
      case 'android':
        return Icons.phone_android_rounded;
      case 'web':
        return Icons.laptop_rounded;
      default:
        return Icons.devices_other_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        title: const Text('Devices'),
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
      ),
      body: RefreshIndicator(
        onRefresh: () => Future.wait([_load(), refreshDashboardCopy(context)]),
        color: AppColors.teal,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          children: [
            const Text(
              'These are devices signed in for notifications on your account. Remove any you do not recognize.',
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: 13,
                height: 1.4,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 20),
            if (_loading)
              const Padding(
                padding: EdgeInsets.only(top: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 24),
                child: Column(
                  children: [
                    Text(_error!, style: const TextStyle(color: AppColors.textMuted)),
                    const SizedBox(height: 12),
                    TextButton(onPressed: _load, child: const Text('Retry')),
                  ],
                ),
              )
            else if (_devices.isEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 40),
                child: Column(
                  children: [
                    Icon(Icons.phonelink_erase_rounded, size: 40, color: AppColors.textMuted.withValues(alpha: 0.7)),
                    const SizedBox(height: 12),
                    const Text(
                      'No devices registered yet',
                      style: TextStyle(
                        color: AppColors.navy,
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Open the app with notifications allowed to register this device.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                    ),
                  ],
                ),
              )
            else
              for (final device in _devices) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.fromLTRB(14, 14, 8, 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: AppRadii.cardRadius,
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: AppColors.navy.withValues(alpha: 0.08),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(_platformIcon(device.platform), color: AppColors.navy, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    _platformLabel(device.platform),
                                    style: const TextStyle(
                                      color: AppColors.navy,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15,
                                    ),
                                  ),
                                ),
                                if (device.isCurrent) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.teal.withValues(alpha: 0.14),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: const Text(
                                      'This device',
                                      style: TextStyle(
                                        color: AppColors.teal,
                                        fontWeight: FontWeight.w800,
                                        fontSize: 10,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Last active ${_formatWhen(device.updatedAt)}',
                              style: const TextStyle(
                                color: AppColors.textMuted,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (device.tokenHint.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                device.tokenHint,
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 11,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      if (_removingId == device.id)
                        const Padding(
                          padding: EdgeInsets.all(12),
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      else
                        IconButton(
                          tooltip: 'Remove device',
                          onPressed: () => _remove(device),
                          icon: const Icon(Icons.delete_outline_rounded),
                          color: const Color(0xFFBA1A1A),
                        ),
                    ],
                  ),
                ),
              ],
          ],
        ),
      ),
    );
  }

  String _formatWhen(DateTime value) {
    final local = value.toLocal();
    final now = DateTime.now();
    final sameDay = local.year == now.year && local.month == now.month && local.day == now.day;
    final time =
        '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
    if (sameDay) return 'today $time';
    return '${local.month}/${local.day}/${local.year} $time';
  }
}
