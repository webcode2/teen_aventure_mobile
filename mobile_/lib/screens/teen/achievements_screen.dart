import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../services/api_client.dart';
import '../../quest_milestones.dart';
import '../../providers/cms_text.dart';
import '../../services/engagement_service.dart';
import '../../theme.dart';
import '../adult/child_achievement_record_screen.dart';
import '../shared/widgets/adventure_list_card.dart';

bool isFamilyAchievementsHub(AuthSession session) =>
    session.isAdult && session.familyId != null;

String ordinalRank(int n) {
  final mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return '${n}th';
  switch (n % 10) {
    case 1:
      return '${n}st';
    case 2:
      return '${n}nd';
    case 3:
      return '${n}rd';
    default:
      return '${n}th';
  }
}

String activityCaption(String type) {
  switch (type) {
    case 'VIDEO_WATCH':
      return 'Watched a lesson video';
    case 'TEEN_QUEST_OBJS':
      return 'Quiz';
    case 'PUZZLE_SOLVE':
      return 'Puzzle';
    case 'PRAYER_DECLARATION':
      return 'Prayer declaration';
    default:
      return type.replaceAll('_', ' ').toLowerCase();
  }
}

String compactWhen(DateTime at) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  final local = at.toLocal();
  return '${months[local.month - 1]} ${local.day}';
}

class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({
    super.key,
    this.embedded = false,
    this.achievementsOverride,
  });

  final bool embedded;
  final Achievements? achievementsOverride;

  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen> {
  Achievements? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    final override = widget.achievementsOverride;
    if (override != null) {
      _data = override;
      _loading = false;
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _load();
      });
    }
  }

  Future<void> _load() async {
    if (widget.achievementsOverride != null) return;
    setState(() {
      _loading = _data == null;
      _error = null;
    });
    try {
      final data = await context.read<EngagementService>().getAchievements();
      if (mounted) setState(() => _data = data);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load achievements.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openChild(AchievementRecord child) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ChildAchievementRecordScreen(
          child: child,
          familyPoints: (_data?.familyPoints ?? 0) +
              (_data?.tracked == true ? _data!.self.points : 0),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    final data = _data;
    final explorers = data?.explorers ?? const <AchievementRecord>[];
    final self = data?.self ?? const AchievementRecord();
    final tracked = data?.tracked ?? false;
    // Adult explorers with their own ledger stay on the personal view; family hub
    // is for parents looking after other explorers.
    final familyHub =
        explorers.isNotEmpty || (isFamilyAchievementsHub(session) && !tracked);

    final ownWeeks = tracked ? self.weeksCompleted : 0;
    final weeksCompleted = familyHub
        ? explorers.fold<int>(ownWeeks, (max, e) => e.weeksCompleted > max ? e.weeksCompleted : max)
        : self.weeksCompleted;
    final points = familyHub
        ? (data?.familyPoints ?? 0) + (tracked ? self.points : 0)
        : self.points;
    final streak = familyHub
        ? explorers.fold<int>(tracked ? self.streak : 0, (max, e) => e.streak > max ? e.streak : max)
        : self.streak;
    final awards = data?.awards ?? knownQuestMilestones;

    final Widget body;
    if (_loading) {
      body = const Center(child: CircularProgressIndicator());
    } else if (data == null) {
      body = _LoadError(message: _error ?? 'Could not load achievements.', onRetry: _load);
    } else {
      body = RefreshIndicator(
        onRefresh: () => Future.wait([_load(), refreshDashboardCopy(context)]),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          children: [
            Text(
              familyHub ? 'Family achievements' : 'Achievements',
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 24,
                letterSpacing: -0.5,
                color: AppColors.navy,
              ),
            ),
            const SizedBox(height: 18),
            ..._achievementContent(
              streak: streak,
              points: points,
              weeksCompleted: weeksCompleted,
              awards: awards,
              recent: self.recent,
              groups: familyHub && !tracked ? const [] : self.groups,
              children: familyHub ? [if (tracked) self, ...explorers] : const [],
              onOpenChild: familyHub ? _openChild : null,
            ),
          ],
        ),
      );
    }

    if (widget.embedded) return Material(color: AppColors.cream, child: body);
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: Text(
          familyHub ? 'Family achievements' : 'Personal achievements',
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
      body: body,
    );
  }

  List<Widget> _achievementContent({
    required int streak,
    required int points,
    required int weeksCompleted,
    required List<QuestMilestone> awards,
    List<FamilyActivity> recent = const [],
    List<GroupPlace> groups = const [],
    List<AchievementRecord> children = const [],
    ValueChanged<AchievementRecord>? onOpenChild,
  }) {
    return [
      _RecordCard(
        value: '$points pts',
        title: 'Victory points',
        tint: AppColors.surfaceVariant,
        icon: Icons.emoji_events_rounded,
        iconColor: AppColors.gold,
        badgeLabel: '$points',
      ),
      const SizedBox(height: 10),
      _RecordCard(
        value: streak <= 0 ? '0 Days' : '$streak Day${streak == 1 ? '' : 's'}',
        title: 'Streak',
        tint: AppColors.terracottaContainer,
        icon: Icons.whatshot_rounded,
        iconColor: AppColors.orange,
        badgeLabel: '$streak',
      ),
      const SizedBox(height: 22),
      const Text(
        'Awards',
        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.navy),
      ),
      const SizedBox(height: 12),
      _AwardsRow(weeksCompleted: weeksCompleted, awards: awards),
      if (recent.isNotEmpty) ...[
        const SizedBox(height: 22),
        const Text(
          'Recent activity',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.navy),
        ),
        const SizedBox(height: 12),
        for (final activity in recent)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AdventureListCard(
              title: activityCaption(activity.activityType),
              subtitle: compactWhen(activity.createdAt),
              icon: Icons.check_circle_rounded,
              accent: AdventureListAccent.green,
              trailing: Text('+${activity.points} pts'),
            ),
          ),
      ],
      if (groups.isNotEmpty) ...[
        const SizedBox(height: 22),
        const Text(
          'Group positions',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.navy),
        ),
        const SizedBox(height: 12),
        for (final place in groups) GroupPlaceTile(place: place),
      ],
      if (onOpenChild != null && children.isNotEmpty) ...[
        const SizedBox(height: 22),
        const Text(
          'Explorers',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.navy),
        ),
        const SizedBox(height: 12),
        for (final child in children)
          Padding(
            key: Key('explorer-tile-${child.childId}'),
            padding: const EdgeInsets.only(bottom: 10),
            child: AdventureListCard(
              title: child.childId == null && child.name.isEmpty
                  ? 'Your record'
                  : child.firstName,
              subtitle: profileMilestoneLine(
                name: child.firstName,
                weeksCompleted: child.weeksCompleted,
              ),
              icon: Icons.person_rounded,
              accent: AdventureListAccent.teal,
              onTap: () => onOpenChild(child),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${child.points} pts',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.teal.withValues(alpha: 0.9),
                  ),
                ],
              ),
            ),
          ),
      ],
    ];
  }
}

class _RecordCard extends StatelessWidget {
  const _RecordCard({
    required this.value,
    required this.title,
    required this.tint,
    required this.icon,
    required this.iconColor,
    required this.badgeLabel,
  });

  final String value;
  final String title;
  final Color tint;
  final IconData icon;
  final Color iconColor;
  final String badgeLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
      decoration: BoxDecoration(
        color: tint,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 20,
                    color: AppColors.navy,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: AppColors.surface.withValues(alpha: 0.75),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.border),
                ),
                child: Icon(icon, size: 34, color: iconColor),
              ),
              Positioned(
                right: -2,
                bottom: -2,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.navy,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    badgeLabel,
                    style: const TextStyle(
                      color: AppColors.cream,
                      fontWeight: FontWeight.w900,
                      fontSize: 11,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AwardsRow extends StatelessWidget {
  const _AwardsRow({
    required this.weeksCompleted,
    required this.awards,
  });

  final int weeksCompleted;
  final List<QuestMilestone> awards;

  @override
  Widget build(BuildContext context) {
    final current = latestMilestone(weeksCompleted, awards);
    final unique = <({QuestMilestone milestone, bool earned, bool isNew})>[
      for (final m in awards)
        (
          milestone: m,
          earned: weeksCompleted >= m.weekComplete,
          isNew: current != null && current.title == m.title && weeksCompleted >= m.weekComplete,
        ),
    ];

    return SizedBox(
      height: 112,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: unique.length,
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (context, i) {
          final award = unique[i];
          final colors = [
            (AppColors.terracottaContainer, AppColors.orange),
            (AppColors.sageContainer, AppColors.forestGreen),
            (AppColors.puzzleTealTint, AppColors.teal),
            (AppColors.surfaceVariant, AppColors.gold),
          ][i % 4];
          return _AwardBadge(
            title: award.milestone.title,
            earned: award.earned,
            isNew: award.isNew,
            tint: colors.$1,
            accent: colors.$2,
            week: award.milestone.weekComplete,
          );
        },
      ),
    );
  }
}

class _AwardBadge extends StatelessWidget {
  const _AwardBadge({
    required this.title,
    required this.earned,
    required this.isNew,
    required this.tint,
    required this.accent,
    required this.week,
  });

  final String title;
  final bool earned;
  final bool isNew;
  final Color tint;
  final Color accent;
  final int week;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 88,
      child: Column(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Opacity(
                opacity: earned ? 1 : 0.38,
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: tint,
                    shape: BoxShape.circle,
                    border: Border.all(color: accent.withValues(alpha: 0.45), width: 2),
                  ),
                  child: Icon(
                    earned ? Icons.military_tech_rounded : Icons.lock_outline_rounded,
                    color: accent,
                    size: 32,
                  ),
                ),
              ),
              if (isNew)
                Positioned(
                  left: -4,
                  top: -4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.orange,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'NEW',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.navy,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'W$week',
                    style: const TextStyle(
                      color: AppColors.cream,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              height: 1.15,
              color: earned ? AppColors.navy : AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}

String groupKindLabel(String kind) {
  switch (kind.toUpperCase()) {
    case 'FAMILY':
      return 'Family';
    case 'CHURCH':
      return 'Church';
    default:
      return 'Class';
  }
}

class GroupPlaceTile extends StatelessWidget {
  const GroupPlaceTile({super.key, required this.place});

  final GroupPlace place;

  @override
  Widget build(BuildContext context) {
    final of = place.memberCount > 0 ? ' of ${place.memberCount}' : '';
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: AdventureListCard(
        title: place.name,
        subtitle: '${groupKindLabel(place.kind)} · ${ordinalRank(place.rank)}$of · ${place.points} pts',
        icon: Icons.emoji_events_rounded,
        accent: AdventureListAccent.gold,
        trailing: Text(
          ordinalRank(place.rank),
          style: const TextStyle(
            fontWeight: FontWeight.w900,
            color: AppColors.gold,
            fontSize: 13,
          ),
        ),
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted)),
            const SizedBox(height: 12),
            FilledButton(onPressed: onRetry, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }
}
