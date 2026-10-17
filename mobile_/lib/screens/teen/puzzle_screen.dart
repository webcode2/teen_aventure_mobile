import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'week_quest_flow.dart';
import '../../models/game_controller.dart';
import '../../theme.dart';
import 'widgets/grid_panel.dart';
import 'widgets/clue_panel.dart';
import 'widgets/custom_keyboard.dart';
import 'widgets/verse_dialog.dart';
import 'widgets/puzzle_status_cards.dart';
import 'widgets/puzzle_win_dialog.dart';

class PuzzleScreen extends StatefulWidget {
  const PuzzleScreen({super.key});

  @override
  State<PuzzleScreen> createState() => _PuzzleScreenState();
}

class _PuzzleScreenState extends State<PuzzleScreen> {
  bool _handledCatchUp = false;
  bool _handledWin = false;
  Timer? _clock;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<GameController>().beginPuzzleTimer();
    });
    _clock = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final game = context.read<GameController>();
      if (!game.isPuzzleComplete) setState(() {});
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

    WidgetsBinding.instance.addPostFrameCallback((_) => _onSolvedWord(game));

    final screenWidth = MediaQuery.of(context).size.width;
    final isTabletLandscape = screenWidth > 720;
    final elapsedLabel = GameController.formatPuzzleElapsed(game.puzzleElapsed);

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
                          const SizedBox(width: 8),
                          const Text('💎', style: TextStyle(fontSize: 12)),
                          const SizedBox(width: 3),
                          Text(
                            '${game.gems}',
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

  Future<void> _onSolvedWord(GameController game) async {
    if (game.newlySolvedWord == null) return;
    final word = game.newlySolvedWord!;
    game.clearNewlySolvedWord();
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (_) => VerseDialog(word: word),
    );
    if (!mounted || !game.isPuzzleComplete) return;

    if (!_handledWin) {
      _handledWin = true;
      _clock?.cancel();
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (_) => PuzzleWinDialog(elapsed: game.puzzleElapsed),
      );
      if (!mounted) return;
      await WeekQuestFlow.recordPuzzleIfSolved(context);
    }

    if (!mounted || _handledCatchUp) return;
    final week = WeekQuestFlow.progress(context);
    if (!(week.videosFinished && week.quizDone)) return;
    _handledCatchUp = true;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle_rounded,
                color: AppColors.forestGreen, size: 52),
            SizedBox(height: 16),
            Text(
              "You're caught up",
              textAlign: TextAlign.center,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 20,
                color: AppColors.navy,
              ),
            ),
            SizedBox(height: 8),
            Text(
              "You've finished this week's quest.",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, color: AppColors.textMuted),
            ),
          ],
        ),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext),
            style: FilledButton.styleFrom(backgroundColor: AppColors.navy),
            child: const Text('Done'),
          ),
        ],
      ),
    );
    if (mounted) Navigator.pop(context);
  }
}
