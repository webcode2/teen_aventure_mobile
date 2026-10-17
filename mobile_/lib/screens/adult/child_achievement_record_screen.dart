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
    required this.familyPoints,
  });

  final AchievementRecord child;
  final int familyPoints;

  @override
  Widget build(BuildContext context) {
    final first = child.firstName;
    final share =
        familyPoints <= 0 ? 0 : ((child.points / familyPoints) * 100).round();
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
            subtitle: profileMilestoneLine(name: first, weeksCompleted: child.weeksCompleted),
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
                value: '${child.points}',
                label: 'Points',
                emphasize: true,
              ),
            ],
          ),
          const SizedBox(height: 12),
          AdventureListCard(
            title: child.totalWeeks > 0
                ? '${child.weeksCompleted} of ${child.totalWeeks} weeks complete'
                : '${child.weeksCompleted} weeks complete',
            subtitle: nextMilestoneLine(child.weeksCompleted),
            icon: Icons.flag_rounded,
            accent: AdventureListAccent.teal,
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
          if (child.groups.isEmpty)
            const AdventureListCard(
              title: 'No group ranks yet',
              subtitle: 'Join a family, church or class group to see ranks here.',
              icon: Icons.groups_rounded,
              accent: AdventureListAccent.navy,
            )
          else
            for (final place in child.groups) GroupPlaceTile(place: place),
          const SizedBox(height: 10),
          const Text(
            'Journey',
            style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 16,
                color: AppColors.navy),
          ),
          const SizedBox(height: 10),
          if (child.recent.isEmpty)
            const AdventureListCard(
              title: 'No scored activities yet',
              icon: Icons.timeline_rounded,
              accent: AdventureListAccent.navy,
            )
          else
            for (final activity in child.recent) ...[
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
