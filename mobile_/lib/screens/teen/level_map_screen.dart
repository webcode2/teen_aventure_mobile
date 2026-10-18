import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/level_map_data.dart';
import '../../models/level_node.dart';
import '../../platform/quest_map_view.dart';
import '../../providers/current_quest_provider.dart';
import '../../providers/hero_copy.dart';
import '../../theme.dart';

/// Copy for a pin that cannot open. Null when the level can be selected.
/// Only unpublished / out-of-range weeks stay locked; future quest weeks are open.
String? lockedLevelNotice(LevelStatus? status) {
  if (status == null || status == LevelStatus.locked) return 'Level locked';
  return null;
}

class LevelMapScreen extends StatefulWidget {
  const LevelMapScreen({
    super.key,
    this.progress,
    this.onQuestOfDayChanged,
  });

  final List<LevelProgress>? progress;

  /// Called after quest-of-the-day is switched to a chosen level (e.g. jump to Home).
  final ValueChanged<int>? onQuestOfDayChanged;

  @override
  State<LevelMapScreen> createState() => _LevelMapScreenState();
}

class _LevelMapScreenState extends State<LevelMapScreen> {
  bool _selecting = false;

  List<LevelProgress> _rowsFor(CurrentQuestProvider? quests) {
    if (widget.progress != null) return widget.progress!;
    final anchor = quests?.progressAnchor;
    if (anchor == null) return mockLevelProgress();
    final total = anchor.totalWeeks > 0 ? anchor.totalWeeks : LevelMapData.levelCount;
    return levelProgressForHighest(
      highestLevelId: anchor.weekNumber,
      totalLevels: total,
      caughtUp: anchor.caughtUp,
    );
  }

  CurrentQuestProvider? _readQuests() {
    try {
      return context.read<CurrentQuestProvider>();
    } catch (_) {
      return null;
    }
  }

  Future<bool> _confirmJumpAhead({
    required int tappedWeek,
    required int sequentialWeek,
    required bool caughtUp,
    required bool currentWeekComplete,
  }) async {
    final notice = jumpAheadPointsNotice(
      tappedWeek: tappedWeek,
      sequentialWeek: sequentialWeek,
      caughtUp: caughtUp,
      currentWeekComplete: currentWeekComplete,
    );
    if (notice == null) return true;
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Jump ahead?'),
        content: Text(notice),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Stay'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.navy),
            child: const Text('Open anyway'),
          ),
        ],
      ),
    );
    return go == true;
  }

  Future<void> _openLevel(int id) async {
    if (!mounted || _selecting) return;
    final quests = _readQuests();
    final rows = _rowsFor(quests);
    LevelProgress? row;
    for (final item in rows) {
      if (item.id == id) row = item;
    }
    final blocked = lockedLevelNotice(row?.status);
    if (blocked != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(blocked)));
      return;
    }

    if (quests == null || quests.progressAnchor == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Quest progress is still loading')),
      );
      return;
    }

    final anchor = quests.progressAnchor!;
    final onAnchor = quests.current?.weekNumber == anchor.weekNumber;
    final progress = quests.progress;
    // Sequential current is normally unfinished; if local cards show it done, use the "next" copy.
    final currentComplete =
        anchor.caughtUp || (onAnchor && (progress?.isCaughtUp ?? false));
    final proceed = await _confirmJumpAhead(
      tappedWeek: id,
      sequentialWeek: anchor.weekNumber,
      caughtUp: anchor.caughtUp,
      currentWeekComplete: currentComplete,
    );
    if (!proceed || !mounted) return;

    setState(() => _selecting = true);
    try {
      final anchorWeek = quests.progressAnchor!.weekNumber;
      await quests.browseToWeek(id);
      if (!mounted) return;
      if (quests.error != null && quests.current?.weekNumber != id) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(quests.error!),
            backgroundColor: AppColors.navy,
          ),
        );
        return;
      }
      final highest = quests.progressAnchor?.weekNumber ?? anchorWeek;
      final message = id == highest
          ? 'Quest of the day is week $id (your current level).'
          : id > highest
              ? 'Quest of the day is week $id. Points still follow Quest $highest in order.'
              : 'Quest of the day is week $id. Your current level stays $highest.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      widget.onQuestOfDayChanged?.call(id);
    } finally {
      if (mounted) setState(() => _selecting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    CurrentQuestProvider? quests;
    try {
      quests = context.watch<CurrentQuestProvider>();
    } catch (_) {
      quests = null;
    }
    final rows = _rowsFor(quests);
    Map<String, String> copy = const {};
    try { copy = context.watch<HeroCopyController>().questCopy; } catch (_) {}
    // Pulse stays on the highest/current level, not the browsed quest-of-the-day.
    return QuestMapView(
      copy: copy,
      pins: buildQuestMapPins(rows),
      revealId: currentLevelIdOf(rows),
      onOpenLevel: _openLevel,
    );
  }
}
