import 'package:flutter/material.dart';
import '../../services/engagement_service.dart';
import '../../theme.dart';
import '../teen/achievements_screen.dart';
import '../shared/widgets/adventure_list_card.dart';

/// Scored activity history for one explorer (or the signed-in self).
class ActivityHistoryScreen extends StatelessWidget {
  const ActivityHistoryScreen({
    super.key,
    required this.title,
    required this.recent,
  });

  final String title;
  final List<FamilyActivity> recent;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (recent.isEmpty)
            const AdventureListCard(
              title: 'No scored activities yet',
              icon: Icons.timeline_rounded,
              accent: AdventureListAccent.navy,
            )
          else
            for (final activity in recent) ...[
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
