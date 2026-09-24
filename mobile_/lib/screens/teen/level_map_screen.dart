import 'package:flutter/material.dart';

import '../../data/level_map_data.dart';
import '../../models/level_node.dart';
import '../../platform/quest_map_view.dart';
import 'objective_quiz_screen.dart';

class LevelMapScreen extends StatefulWidget {
  const LevelMapScreen({super.key, this.progress});

  final List<LevelProgress>? progress;

  @override
  State<LevelMapScreen> createState() => _LevelMapScreenState();
}

class _LevelMapScreenState extends State<LevelMapScreen> {
  List<LevelProgress> get _rows => widget.progress ?? mockLevelProgress();

  void _openLevel(int id) {
    if (!mounted) return;
    LevelProgress? row;
    for (final item in _rows) {
      if (item.id == id) row = item;
    }
    if (row == null || row.status == LevelStatus.locked) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Level locked')),
      );
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute<void>(
        builder: (_) => ObjectiveQuizScreen(levelId: id),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;
    return QuestMapView(
      pins: buildQuestMapPins(rows),
      revealId: currentLevelIdOf(rows),
      onOpenLevel: _openLevel,
    );
  }
}
