import 'package:flutter/material.dart';
import '../../family/family_account_rules.dart';
import '../../models/api_models.dart';
import '../../nudge_copy.dart';
import '../../theme.dart';

/// Inbox for parent cheers and group deletion notices (not the same as sticker nudges).
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({
    super.key,
    this.nudges = const [],
    this.deletionNotices = const [],
  });

  final List<Nudge> nudges;
  final List<Map<String, dynamic>> deletionNotices;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        title: const Text(
          'Notifications',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
        children: [
          if (deletionNotices.isNotEmpty) ...[
            const _SectionLabel('Group deletion'),
            const SizedBox(height: 8),
            for (var i = 0; i < deletionNotices.length; i++) ...[
              if (i > 0) const SizedBox(height: 10),
              _DeletionNoticeTile(item: deletionNotices[i]),
            ],
            const SizedBox(height: 20),
          ],
          if (nudges.isNotEmpty) ...[
            const _SectionLabel('Encouragements'),
            const SizedBox(height: 8),
            for (var i = 0; i < nudges.length; i++) ...[
              if (i > 0) const SizedBox(height: 10),
              _NotificationTile(nudge: nudges[i]),
            ],
          ] else if (deletionNotices.isEmpty)
            const _EmptyCard(
              icon: Icons.notifications_none_rounded,
              title: 'No notifications yet',
              body: 'Cheers from your parent and group deletion notices appear here.',
            ),
        ],
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
  const _NotificationTile({required this.nudge});

  final Nudge nudge;

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
                    const Expanded(
                      child: Text(
                        'Encouragement',
                        style: TextStyle(
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
                  messageForNudge(nudge.stickerKey),
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
      decoration: BoxDecoration(
        color: const Color(0xFFFFDAD6),
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
