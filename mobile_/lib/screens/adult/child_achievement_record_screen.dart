import 'package:flutter/material.dart';
import '../../quest_milestones.dart';
import '../../services/engagement_service.dart';
import '../../theme.dart';
import '../teen/achievements_screen.dart';
import '../shared/widgets/adventure_list_card.dart';
import '../shared/widgets/circle_stats_card.dart';

class ChildAchievementRecordScreen extends StatelessWidget {
  const ChildAchievementRecordScreen({
    super.key,
    required this.child,
    required this.familyJar,
    this.activities = const [],
    this.positions = const [],
  });

  final FamilyChildScore child;
  final int familyJar;
  final List<FamilyActivity> activities;
  final List<GroupPosition> positions;

  @override
  Widget build(BuildContext context) {
    final first = child.name.trim().split(' ').first;
    final ownActivities =
        activities.where((a) => a.childId == child.childId).toList();
    final share =
        familyJar <= 0 ? 0 : ((child.askScore / familyJar) * 100).round();
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: Text('$first’s record',
            style: const TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          CircleStatsCard(
            
            title: '$first’s Journey',
            subtitle: 'Share, streak, and family points',
            stats: [
              CircleStat(
                icon: Icons.pie_chart_rounded,
                iconColor: AppColors.orange,
                value: '$share%',
                label: 'Share',
              ),
              CircleStat(
                icon: Icons.local_fire_department_rounded,
                iconColor: AppColors.orange,
                value: '${child.streak}',
                label: 'Streak',
              ),
              CircleStat(
                icon: Icons.stars_rounded,
                iconColor: AppColors.gold,
                value: '${child.askScore}',
                label: 'Points',
                emphasize: true,
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Text(
            'Group positions',
            style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 16,
                color: AppColors.navy),
          ),
          const SizedBox(height: 10),
          if (positions.isEmpty)
            const AdventureListCard(
              title: 'No group ranks yet',
              subtitle: 'Finish an opened class quiz to appear here.',
              icon: Icons.groups_rounded,
              accent: AdventureListAccent.navy,
            )
          else
            for (final row in positions) ...[
              AdventureListCard(
                title: row.className,
                subtitle:
                    '${ordinalRank(row.entry.rank)} · ${row.entry.points} pts',
                icon: Icons.emoji_events_rounded,
                accent: AdventureListAccent.gold,
                trailing: Text(
                  ordinalRank(row.entry.rank),
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    color: AppColors.gold,
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],
          const SizedBox(height: 10),
          const Text(
            'Journey',
            style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 16,
                color: AppColors.navy),
          ),
          const SizedBox(height: 10),
          if (ownActivities.isEmpty)
            const AdventureListCard(
              title: 'No scored activities yet',
              icon: Icons.timeline_rounded,
              accent: AdventureListAccent.navy,
            )
          else
            for (final activity in ownActivities) ...[
              AdventureListCard(
                title: activityCaption(activity.activityType),
                subtitle: compactWhen(activity.createdAt),
                icon: Icons.check_circle_rounded,
                accent: AdventureListAccent.green,
                trailing: Text(
                  '+${activity.points}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    color: AppColors.forestGreen,
                    fontSize: 14,
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],
        ],
      ),
    );
  }
}
