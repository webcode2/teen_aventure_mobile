import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/api_models.dart';
import '../../models/auth_session.dart';
import '../../models/game_controller.dart';
import '../../quest_milestones.dart';
import '../../services/engagement_service.dart';
import '../../theme.dart';
import '../adult/child_achievement_record_screen.dart';
import '../shared/widgets/adventure_list_card.dart';

class GroupPosition {
  const GroupPosition({required this.className, required this.entry});

  final String className;
  final LeaderboardEntry entry;
}

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
      return 'Quest quiz';
    case 'TEEN_QUEST_SCRAMBLE':
      return 'Quest activity';
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

List<GroupPosition> positionsForChild(List<GroupPosition> positions, FamilyChildScore child) {
  final first = child.name.trim().split(' ').first;
  return positions.where((position) {
    final row = position.entry;
    if (row.childId != null && row.childId == child.childId) return true;
    return row.childName == first;
  }).toList();
}

class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({
    super.key,
    this.embedded = false,
    this.weeksCompletedOverride,
    this.familySummaryOverride,
    this.groupPositionsOverride,
  });

  final bool embedded;
  final int? weeksCompletedOverride;
  final FamilySummary? familySummaryOverride;
  final List<GroupPosition>? groupPositionsOverride;

  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen> {
  FamilySummary? _summary;
  List<GroupPosition> _positions = const [];

  @override
  void initState() {
    super.initState();
    _summary = widget.familySummaryOverride;
    _positions = widget.groupPositionsOverride ?? const [];
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (widget.familySummaryOverride == null) _loadFamily();
      if (widget.groupPositionsOverride == null) _loadPositions();
    });
  }

  Future<void> _loadFamily() async {
    final session = context.read<AuthSession>();
    if (!isFamilyAchievementsHub(session)) return;
    try {
      final summary = await context.read<EngagementService>().getFamilySummary();
      if (mounted) setState(() => _summary = summary);
    } catch (_) {}
  }

  Future<void> _loadPositions() async {
    final session = context.read<AuthSession>();
    if (!isFamilyAchievementsHub(session)) return;
    EngagementService engagement;
    try {
      engagement = context.read<EngagementService>();
    } catch (_) {
      return;
    }
    final children = _summary?.children ?? const <FamilyChildScore>[];
    try {
      final places = await engagement.familyGroupPlaces(
        children: children,
        classes: [
          for (final cls in session.allAssignedClasses) (id: cls.id, name: cls.name),
        ],
      );
      if (mounted) {
        setState(() {
          _positions = [
            for (final place in places) GroupPosition(className: place.className, entry: place.entry),
          ];
        });
      }
    } catch (_) {}
  }

  void _openChild(FamilyChildScore child) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ChildAchievementRecordScreen(
          child: child,
          familyJar: _summary?.familyJar ?? _summary?.familyAskScore ?? 0,
          activities: _summary?.recent ?? const [],
          positions: positionsForChild(_positions, child),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    final game = context.watch<GameController>();
    final familyHub = isFamilyAchievementsHub(session);
    final children = _summary?.children ?? const <FamilyChildScore>[];
    final weeksCompleted = widget.weeksCompletedOverride ??
        SampleWeekProgress.weeksFromParts(game.completedVideoParts);
    final childPoints = children.fold<int>(0, (sum, child) => sum + child.askScore);
    final familyPoints = _summary?.familyAskScore ?? childPoints;
    final points = familyHub ? familyPoints + game.score : game.score;
    final streak = familyHub
        ? children.fold<int>(0, (max, c) => c.streak > max ? c.streak : max).clamp(0, 999)
        : game.streakDays;
    final current = latestMilestone(weeksCompleted);
    final next = nextMilestone(weeksCompleted);

    final body = ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      children: [
        Text(
          familyHub ? 'Family achievements' : ' Achievements',
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
          current: current,
          next: next,
          sessionsDone: game.weekQuest.completed,
          children: familyHub ? children : const [],
          onOpenChild: familyHub ? _openChild : null,
        ),
      ],
    );

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
    required QuestMilestone current,
    required QuestMilestone? next,
    required int sessionsDone,
    List<FamilyChildScore> children = const [],
    ValueChanged<FamilyChildScore>? onOpenChild,
  }) {
    final longestStreak = streak;
    return [
      Row(
        children: [
          Expanded(
            child: _QuickStatCard(
              value: streak <= 0 ? '0' : '$streak Day${streak == 1 ? '' : 's'}',
              label: 'Total Streak',
              icon: Icons.local_fire_department_rounded,
              iconColor: AppColors.orange,
              iconBg: AppColors.terracottaContainer,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _QuickStatCard(
              value: '$points',
              label: 'Total Points',
              icon: Icons.stars_rounded,
              iconColor: AppColors.forestGreen,
              iconBg: AppColors.sageContainer,
            ),
          ),
        ],
      ),
      const SizedBox(height: 22),
  
     const SizedBox(height: 12),
      _RecordCard(
        value: '$points pts',
        title: 'Victory points',
        dateLabel: current.criteria,
        tint: AppColors.surfaceVariant,
        icon: Icons.emoji_events_rounded,
        iconColor: AppColors.gold,
        badgeLabel: '$points',
      ),
      const SizedBox(height: 10),
      _RecordCard(
        value: longestStreak <= 0 ? '0 Days' : '$longestStreak Day${longestStreak == 1 ? '' : 's'}',
        title: 'Streak',
        dateLabel: sessionsDone > 0 ? 'This quest week' : 'Keep exploring',
        tint: AppColors.terracottaContainer,
        icon: Icons.whatshot_rounded,
        iconColor: AppColors.orange,
        badgeLabel: '$longestStreak',
      ),
      const SizedBox(height: 22),
      const Text(
        'Awards',
        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.navy),
      ),
      const SizedBox(height: 12),
      _AwardsRow(weeksCompleted: weeksCompleted, currentTitle: current.title, next: next),
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
              title: child.name.split(' ').first,
              subtitle: profileMilestoneLine(
                name: child.name.split(' ').first,
                weeksCompleted: weeksCompleted,
              ),
              icon: Icons.person_rounded,
              accent: AdventureListAccent.teal,
              onTap: () => onOpenChild(child),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '${child.askScore} pts',
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

class _QuickStatCard extends StatelessWidget {
  const _QuickStatCard({
    required this.value,
    required this.label,
    required this.icon,
    required this.iconColor,
    required this.iconBg,
  });

  final String value;
  final String label;
  final IconData icon;
  final Color iconColor;
  final Color iconBg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 12, 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
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
                    fontSize: 22,
                    letterSpacing: -0.4,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
            child: Icon(icon, color: iconColor, size: 24),
          ),
        ],
      ),
    );
  }
}

class _RecordCard extends StatelessWidget {
  const _RecordCard({
    required this.value,
    required this.title,
    required this.dateLabel,
    required this.tint,
    required this.icon,
    required this.iconColor,
    required this.badgeLabel,
  });

  final String value;
  final String title;
  final String dateLabel;
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
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.schedule_rounded, size: 14, color: AppColors.textMuted),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        dateLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ),
                  ],
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
    required this.currentTitle,
    required this.next,
  });

  final int weeksCompleted;
  final String currentTitle;
  final QuestMilestone? next;

  @override
  Widget build(BuildContext context) {
    final awards = <({QuestMilestone milestone, bool earned, bool isNew})>[
      for (final m in knownQuestMilestones)
        (
          milestone: m,
          earned: weeksCompleted >= m.weekComplete,
          isNew: latestMilestone(weeksCompleted).title == m.title && weeksCompleted >= m.weekComplete,
        ),
      if (next != null)
        (milestone: next!, earned: false, isNew: false),
    ];
    // Dedupe if next is already in known list
    final seen = <String>{};
    final unique = <({QuestMilestone milestone, bool earned, bool isNew})>[];
    for (final a in awards) {
      if (seen.add(a.milestone.title)) unique.add(a);
    }

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

class SampleWeekProgress {
  static int weeksFromParts(int parts) => parts > 0 ? 1 : 0;
}
