import 'package:flutter/material.dart';

import '../../theme.dart';
import 'level_map_screen.dart';

/// Adventure map opened from the Quest tab or Home quiz row.
class QuestJourneyScreen extends StatelessWidget {
  const QuestJourneyScreen({super.key, this.embedded = false});

  final bool embedded;

  static const Color sky = Color(0xFFB9E6F4);

  @override
  Widget build(BuildContext context) {
    const map = ColoredBox(color: sky, child: LevelMapScreen());
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
