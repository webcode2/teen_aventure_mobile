import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/api_models.dart';
import '../../models/auth_session.dart';
import '../../models/game_controller.dart';
import '../../models/game_time_limit.dart';
import '../../models/matching_controller.dart';
import '../../models/video_lesson.dart';
import '../../models/week_quest_progress.dart';
import '../../providers/current_quest_provider.dart';
import '../../services/content_service.dart';
import 'matching_screen.dart';
import 'objective_quiz_screen.dart';
import 'puzzle_screen.dart';
import 'video_learning_screen.dart';

/// Opens the next unfinished home-quest step (video → quiz → puzzle) for the
/// explorer's loaded week. Does nothing when that week is not on the device.
class WeekQuestFlow {
  static CurrentQuestProvider? _provider(BuildContext context) {
    try {
      return context.read<CurrentQuestProvider>();
    } catch (_) {
      return null;
    }
  }

  static CurrentQuest? _current(BuildContext context) => _provider(context)?.current;

  static bool _tracked(BuildContext context) => _current(context)?.tracked == true;

  static List<VideoLesson> _videos(BuildContext context) =>
      _current(context)?.quest.videos ?? const [];

  static String _weekLabel(BuildContext context) {
    final week = _current(context)?.weekNumber;
    return week == null ? '' : 'Week $week Quest';
  }

  static String _passage(BuildContext context) => _current(context)?.passage ?? '';

  /// Server progress when this account is tracked, else this device's progress.
  static WeekQuestProgress progress(BuildContext context) {
    final provider = _provider(context);
    final server = provider?.current?.tracked == true ? provider!.progress : null;
    if (server != null) return server;
    final local = context.read<GameController>().weekQuest;
    return WeekQuestProgress(
      videosDone: local.videosDone,
      quizDone: local.quizDone,
      puzzleDone: local.puzzleDone,
      videoCount: _videos(context).length,
      watchedIndexes: local.watchedIndexes,
    );
  }

  static Widget _videoPage(BuildContext context, int index) => VideoLearningScreen(
        lesson: _videos(context)[index],
        videoIndex: index,
        weekLabel: _weekLabel(context),
        lessonTitle: _passage(context),
      );

  static Widget? _quizPage(BuildContext context) {
    final provider = _provider(context);
    final quiz = _current(context)?.quest.objectiveQuiz ?? const [];
    if (quiz.isEmpty) return null;
    final questions = quiz.map((item) => item.toQuizQuestion()).toList();
    final alreadyDone = progress(context).quizDone;
    return ObjectiveQuizScreen(
      questionsOverride: questions,
      alreadyCompleted: alreadyDone,
      onSubmitLive: _tracked(context) && !alreadyDone
          ? (answers) async {
              final points = await provider?.completeStep('QUIZ', answers: answers) ?? 0;
              if (points > 0 && context.mounted) {
                try {
                  context.read<GameController>().applyActivityPoints(points);
                } catch (_) {}
              }
              return points;
            }
          : null,
    );
  }

  static Future<void> openVideo(BuildContext context, int index) async {
    if (index < 0 || index >= _videos(context).length) return;
    final page = _videoPage(context, index);
    await Navigator.push<void>(context, MaterialPageRoute(builder: (_) => page));
  }

  static Future<void> openQuiz(BuildContext context) async {
    final page = _quizPage(context);
    if (page == null) return;
    await Navigator.push<void>(context, MaterialPageRoute(builder: (_) => page));
  }

  static Future<void> openPuzzle(BuildContext context) async {
    final quest = _current(context)?.quest;
    final matchingId = quest?.matchingId?.trim();
    if (quest != null &&
        quest.isMatchingGame &&
        matchingId != null &&
        matchingId.isNotEmpty) {
      if (!context.mounted) return;
      await Navigator.push<void>(
        context,
        MaterialPageRoute(
          builder: (_) => MatchingScreen(matchingId: matchingId),
        ),
      );
      return;
    }

    // Load this week's attached Studio crossword — never the global catalogue.
    try {
      final game = context.read<GameController>();
      final content = context.read<ContentService>();
      final puzzleId = quest?.puzzleId?.trim();
      if (puzzleId == null || puzzleId.isEmpty) {
        game.markTechnicalIssue('This week has no game attached yet.');
      } else {
        await game.loadLiveFromDatabase(
          contentService: content,
          puzzleId: puzzleId,
          keepUnchangedBoard: true,
        );
      }
    } catch (_) {}

    if (!context.mounted) return;
    await Navigator.push<void>(
      context,
      MaterialPageRoute(builder: (_) => const PuzzleScreen()),
    );
    if (context.mounted) await recordPuzzleIfSolved(context);
  }

  static int? defaultGamePoints(BuildContext context) =>
      _current(context)?.puzzlePoints;

  // A graded result is recorded by the reward API for the specific game and week.
  static Future<ActivityAward> recordGamePass(
    BuildContext context, {
    required GameRoundScore score,
    required String? versionId,
    required bool matching,
  }) async {
    if (!score.passed) return ActivityAward.failed;
    final game = context.read<GameController>();
    final provider = _provider(context);
    if (provider?.current?.puzzleDone == true || provider?.current?.tracked != true) {
      game.completeWeekPuzzle();
      return const ActivityAward(ok: true, points: 0, alreadyAwarded: true, gamePassed: true);
    }
    if (versionId == null || versionId.isEmpty) return ActivityAward.failed;

    String? childId;
    try {
      childId = context.read<AuthSession>().effectiveChildId;
    } catch (_) {}
    final content = context.read<ContentService>();
    final award = matching
        ? await content.claimMatchingReward(versionId, childId: childId, answers: score.answers)
        : await content.claimPuzzleReward(versionId, childId: childId, answers: score.answers);
    if (!context.mounted || award.gamePassed != true) return ActivityAward.failed;

    if (award.awardedFresh) game.applyActivityPoints(award.points);
    game.completeWeekPuzzle();
    await provider!.refresh();
    return award;
  }

  static Future<int> recordPuzzleIfSolved(BuildContext context) async {
    final game = context.read<GameController>();
    if (!game.isPuzzleComplete) return 0;
    final award = await recordGamePass(
      context,
      score: game.roundScore(defaultGamePoints(context)),
      versionId: game.activePuzzleVersionId,
      matching: false,
    );
    return award.points;
  }

  static Future<int> recordMatchingIfSolved(BuildContext context, MatchingController match) async {
    if (!match.isComplete) return 0;
    final award = await recordGamePass(
      context,
      score: match.roundScore(defaultGamePoints(context)),
      versionId: match.versionId,
      matching: true,
    );
    return award.points;
  }

  static Future<void> openNext(
    BuildContext context, {
    bool replace = false,
  }) async {
    final current = progress(context);
    final videoIndex = current.nextVideoIndex;
    if (videoIndex != null) {
      if (videoIndex >= _videos(context).length) {
        if (replace && Navigator.canPop(context)) Navigator.pop(context);
        return;
      }
      final page = _videoPage(context, videoIndex);
      final route = MaterialPageRoute<void>(builder: (_) => page);
      if (replace) {
        await Navigator.pushReplacement(context, route);
      } else {
        await Navigator.push(context, route);
      }
      return;
    }
    if (!current.quizDone) {
      final quiz = _quizPage(context);
      if (quiz == null) {
        if (replace && Navigator.canPop(context)) Navigator.pop(context);
        return;
      }
      final route = MaterialPageRoute<void>(builder: (_) => quiz);
      if (replace) {
        await Navigator.pushReplacement(context, route);
      } else {
        await Navigator.push(context, route);
      }
      return;
    }
    if (!current.puzzleDone) {
      // Always reload the week's attached puzzle — never open a stale global grid.
      if (replace && Navigator.canPop(context)) Navigator.pop(context);
      if (!context.mounted) return;
      await openPuzzle(context);
      return;
    }
    if (replace && Navigator.canPop(context)) Navigator.pop(context);
  }
}
