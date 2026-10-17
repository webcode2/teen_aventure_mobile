import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../family/family_account_rules.dart';
import '../../models/api_models.dart';
import '../../nudge_copy.dart';
import '../../services/engagement_service.dart';
import '../../theme.dart';

/// Result popped back to home so the badge and list stay in sync after clear/dismiss.
class NotificationsResult {
  const NotificationsResult({required this.nudges});

  final List<Nudge> nudges;
}

/// Inbox for approved encouragements and group deletion notices.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({
    super.key,
    this.nudges = const [],
    this.deletionNotices = const [],
  });

  final List<Nudge> nudges;
  final List<Map<String, dynamic>> deletionNotices;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late List<Nudge> _nudges;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _nudges = List<Nudge>.from(widget.nudges);
  }

  bool get _canClear => _nudges.isNotEmpty;

  void _popResult() {
    Navigator.of(context).pop(NotificationsResult(nudges: _nudges));
  }

  Future<void> _clearAll() async {
    if (_busy || !_canClear) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear notifications?'),
        content: const Text('This removes encouragements from your inbox.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;

    setState(() => _busy = true);
    final engagement = context.read<EngagementService>();
    try {
      await engagement.clearNudges();
      if (!mounted) return;
      setState(() {
        _nudges = [];
        _busy = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not clear notifications.')),
      );
    }
  }

  Future<void> _dismissNudge(Nudge nudge) async {
    if (_busy) return;
    setState(() => _busy = true);
    final engagement = context.read<EngagementService>();
    try {
      await engagement.deleteNudge(nudge.id);
      if (!mounted) return;
      setState(() {
        _nudges = [for (final n in _nudges) if (n.id != nudge.id) n];
        _busy = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not remove that notification.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final deletions = widget.deletionNotices;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        _popResult();
      },
      child: Scaffold(
        backgroundColor: AppColors.cream,
        appBar: AppBar(
          title: const Text(
            'Notifications',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
          actions: [
            if (_canClear)
              TextButton(
                onPressed: _busy ? null : _clearAll,
                child: const Text(
                  'Clear all',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
          children: [
            if (deletions.isNotEmpty) ...[
              const _SectionLabel('Group deletion'),
              const SizedBox(height: 8),
              for (var i = 0; i < deletions.length; i++) ...[
                if (i > 0) const SizedBox(height: 10),
                _DeletionNoticeTile(item: deletions[i]),
              ],
              const SizedBox(height: 20),
            ],
            if (_nudges.isNotEmpty) ...[
              const _SectionLabel('Encouragements'),
              const SizedBox(height: 8),
              for (var i = 0; i < _nudges.length; i++) ...[
                if (i > 0) const SizedBox(height: 10),
                _NotificationTile(
                  nudge: _nudges[i],
                  onDismiss: _busy ? null : () => _dismissNudge(_nudges[i]),
                ),
              ],
            ] else if (deletions.isEmpty)
              const _EmptyCard(
                icon: Icons.notifications_none_rounded,
                title: 'No notifications yet',
                body: 'Approved encouragements and group deletion notices appear here.',
              ),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w900,
        letterSpacing: 0.6,
        color: AppColors.textMuted,
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  const _EmptyCard({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppRadii.cardRadius,
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: AppColors.orange.withValues(alpha: 0.14),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.orange, size: 28),
          ),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 16,
              color: AppColors.navy,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            body,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              height: 1.35,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.nudge, this.onDismiss});

  final Nudge nudge;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    final unread = nudge.readAt == null;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: unread ? const Color(0xFFFFF4DC) : Colors.white,
        borderRadius: AppRadii.cardRadius,
        border: Border.all(
          color: unread ? AppColors.orange.withValues(alpha: 0.35) : AppColors.border,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.orange.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.favorite_rounded, color: AppColors.orange),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        nudge.sourceLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          color: AppColors.orange,
                        ),
                      ),
                    ),
                    if (unread)
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppColors.orange,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  messageForNudge(nudge.stickerKey, message: nudge.message),
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    height: 1.35,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _relative(nudge.createdAt),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          if (onDismiss != null)
            IconButton(
              tooltip: 'Remove',
              onPressed: onDismiss,
              icon: const Icon(Icons.close_rounded, size: 20),
              color: AppColors.textMuted,
              visualDensity: VisualDensity.compact,
            ),
        ],
      ),
    );
  }
}

class _DeletionNoticeTile extends StatelessWidget {
  const _DeletionNoticeTile({required this.item});

  final Map<String, dynamic> item;

  @override
  Widget build(BuildContext context) {
    final started = deletionStartedAt(item);
    final body = started == null
        ? 'This group is scheduled for deletion. All members will be removed when the deletion period ends.'
        : groupDeletionBannerText(scheduledDeletionDeadline(started));
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Color(0xFFFFDAD6),
        borderRadius: AppRadii.cardRadius,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            item['name'] as String? ?? 'Group',
            style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF410E0B)),
          ),
          const SizedBox(height: 6),
          Text(
            body,
            style: const TextStyle(color: Color(0xFF410E0B), height: 1.35),
          ),
        ],
      ),
    );
  }
}

String _relative(DateTime at) {
  final delta = DateTime.now().difference(at);
  if (delta.inMinutes < 60) return '${delta.inMinutes.clamp(1, 59)} min ago';
  if (delta.inHours < 24) return '${delta.inHours} hrs ago';
  if (delta.inDays == 1) return 'Yesterday';
  return '${delta.inDays} days ago';
}
