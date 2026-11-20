import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'week_quest_flow.dart';
import '../../models/game_controller.dart';
import '../../theme.dart';
import 'widgets/game_timeout_dialog.dart';
import 'widgets/grid_panel.dart';
import 'widgets/clue_panel.dart';
import 'widgets/custom_keyboard.dart';
import 'widgets/puzzle_status_cards.dart';
import 'widgets/puzzle_win_dialog.dart';

class PuzzleScreen extends StatefulWidget {
  const PuzzleScreen({super.key});

  @override
  State<PuzzleScreen> createState() => _PuzzleScreenState();
}

class _PuzzleScreenState extends State<PuzzleScreen> {
  bool _handledWin = false;
  Timer? _clock;
  bool _showingTimeout = false;

  @override
  void initState() {
    super.initState();
    _clock = Timer.periodic(const Duration(milliseconds: 250), (_) {
      if (!mounted) return;
      final game = context.read<GameController>();
      if (game.puzzleScreenState != PuzzleScreenState.ready || game.isPuzzleComplete) return;
      setState(() {});
      if (game.puzzleTimedOut && !_showingTimeout) unawaited(_onTimeout(game));
    });
  }

  @override
  void dispose() {
    _clock?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameController>();

    switch (game.puzzleScreenState) {
      case PuzzleScreenState.loading:
        return Scaffold(
          body: Container(
            decoration: TeenAppTheme.headerGradient,
            child: const SafeArea(
              child: Center(child: CircularProgressIndicator(color: Colors.white)),
            ),
          ),
        );
      case PuzzleScreenState.rejected:
        return Scaffold(
          body: Container(
            decoration: TeenAppTheme.headerGradient,
            child: SafeArea(
              child: PuzzleRejectCard(
                message: game.puzzleStatusMessage ??
                    kPuzzleTechnicalIssueMessage,
                onRetry: () => game.loadLiveFromDatabase(
                  puzzleId: game.boundPuzzleId,
                ),
              ),
            ),
          ),
        );
      case PuzzleScreenState.unsupported:
        return Scaffold(
          body: Container(
            decoration: TeenAppTheme.headerGradient,
            child: SafeArea(
              child: PuzzleUpdateAppCard(detail: game.puzzleStatusMessage),
            ),
          ),
        );
      case PuzzleScreenState.ready:
        break;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      game.beginPuzzleTimer();
      if (!game.puzzleTimedOut) unawaited(_onSolvedWord(game));
    });

    final screenWidth = MediaQuery.of(context).size.width;
    final isTabletLandscape = screenWidth > 720;
    final remaining = game.puzzleRemaining;
    final elapsedLabel = GameController.formatPuzzleElapsed(remaining ?? game.puzzleElapsed);

    return Scaffold(
      body: Container(
        decoration: TeenAppTheme.headerGradient,
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Colors.white, size: 22),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: game.totalWords == 0
                                    ? 0
                                    : game.solvedWordsCount / game.totalWords,
                                backgroundColor: Colors.white24,
                                valueColor: const AlwaysStoppedAnimation<Color>(
                                    TeenAppTheme.freshGreen),
                                minHeight: 6,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '${game.solvedWordsCount}/${game.totalWords}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.timer_outlined,
                              color: Colors.white, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            elapsedLabel,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            remaining == null ? 'elapsed' : 'left',
                            style: const TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                          const SizedBox(width: 8),
                          const Text('💎', style: TextStyle(fontSize: 12)),
                          const SizedBox(width: 3),
                          Text(
                            '${game.clueGemsRemaining}',
                            style: const TextStyle(
                              color: TeenAppTheme.gold,
                              fontWeight: FontWeight.w900,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Container(
                  color: TeenAppTheme.cream,
                  child: isTabletLandscape
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: Row(
                            children: [
                              Expanded(flex: 5, child: GridPanel()),
                              SizedBox(width: 12),
                              Expanded(flex: 5, child: CluePanel()),
                            ],
                          ),
                        )
                      : const Column(
                          children: [
                            Expanded(
                              flex: 6,
                              child: Padding(
                                padding: EdgeInsets.all(4.0),
                                child: GridPanel(),
                              ),
                            ),
                            Expanded(
                              flex: 3,
                              child: Padding(
                                padding: EdgeInsets.symmetric(horizontal: 4.0),
                                child: CluePanel(),
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              const CustomKeyboard(),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _onTimeout(GameController game) async {
    _showingTimeout = true;
    final score = game.roundScore(WeekQuestFlow.defaultGamePoints(context));
    final award = score.passed
        ? await WeekQuestFlow.recordGamePass(
            context, score: score, versionId: game.activePuzzleVersionId, matching: false,
          )
        : null;
    if (!mounted) return;
    final retry = await showGameTimeoutDialog(
      context,
      gameTitle: game.activePuzzleTitle ?? game.episode.title,
      score: score,
      itemLabel: 'word',
      award: award,
    );
    if (!mounted) return;
    if (retry == true) {
      game.retryTimedPuzzle();
      _showingTimeout = false;
    } else {
      Navigator.pop(context);
    }
  }

  Future<void> _onSolvedWord(GameController game) async {
    if (!mounted || game.newlySolvedWord == null) return;
    final word = game.newlySolvedWord!;
    game.clearNewlySolvedWord();
    if (!game.isPuzzleComplete || _handledWin) return;
    _handledWin = true;
    _clock?.cancel();
    final elapsed = game.puzzleElapsed;
    final wordsSolved = game.solvedWordsCount;
    final points = await WeekQuestFlow.recordPuzzleIfSolved(context);
    if (!mounted) return;
    final week = WeekQuestFlow.progress(context);
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => PuzzleWinDialog(
        elapsed: elapsed,
        wordsSolved: wordsSolved,
        points: points,
        title: 'Well done, Explorer!',
        gameName: game.activePuzzleTitle ?? game.episode.title,
        scriptureReference: word.ref,
        message: 'You solved every word. Keep exploring Scripture one clue at a time!',
      ),
    );
    if (!mounted) return;
    if (week.videosFinished && week.quizDone) {
      Navigator.pop(context);
    } else {
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
  }
}
