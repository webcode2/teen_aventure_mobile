import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../data/episodes.dart';
import '../../models/game_controller.dart';
import 'objective_quiz_screen.dart';
import 'puzzle_screen.dart';
import 'video_learning_screen.dart';

/// Opens the next unfinished home-quest step (video → quiz → puzzle).
class WeekQuestFlow {
  static const passage = 'Joshua 1–4';

  static Future<void> openNext(
    BuildContext context, {
    bool replace = false,
  }) async {
    final page = _nextPage(context);
    if (page == null) {
      if (replace && Navigator.canPop(context)) Navigator.pop(context);
      return;
    }
    final route = MaterialPageRoute<void>(builder: (_) => page);
    if (replace) {
      await Navigator.pushReplacement(context, route);
    } else {
      await Navigator.push(context, route);
    }
  }

  static Widget? _nextPage(BuildContext context) {
    final progress = context.read<GameController>().weekQuest;
    final pack = SampleEpisodes.week1Package;
    final videoIndex = progress.nextVideoIndex;
    if (videoIndex != null) {
      if (videoIndex >= pack.videos.length) return null;
      return VideoLearningScreen(
        lesson: pack.videos[videoIndex],
        weekLabel: 'Week ${pack.weekNumber} Quest',
        lessonTitle: passage,
      );
    }
    if (!progress.quizDone) return const ObjectiveQuizScreen();
    if (!progress.puzzleDone) return const PuzzleScreen();
    return null;
  }
}
