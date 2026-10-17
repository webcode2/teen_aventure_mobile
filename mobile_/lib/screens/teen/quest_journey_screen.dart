import 'package:flutter/material.dart';

import '../../theme.dart';
import 'level_map_screen.dart';

/// Adventure map opened from the Quest tab or Home quiz row.
class QuestJourneyScreen extends StatelessWidget {
  const QuestJourneyScreen({
    super.key,
    this.embedded = false,
    this.onQuestOfDayChanged,
  });

  final bool embedded;

  /// Fired after a map level updates quest-of-the-day (highest level unchanged).
  final ValueChanged<int>? onQuestOfDayChanged;

  static const Color sky = Color(0xFF073C43);

  @override
  Widget build(BuildContext context) {
    final map = ColoredBox(
      color: sky,
      child: LevelMapScreen(onQuestOfDayChanged: onQuestOfDayChanged),
    );
    if (embedded) return map;
    return Scaffold(
      backgroundColor: sky,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: const Text(
          'Quest journey',
          style: TextStyle(fontWeight: FontWeight.w600, letterSpacing: -0.3),
        ),
      ),
      body: map,
    );
  }
}
