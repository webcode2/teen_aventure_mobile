import '../../../providers/cms_text.dart';

import 'package:flutter/material.dart';

import '../../../models/game_controller.dart';
import '../../../theme.dart';
import 'celebration_flowers.dart';

/// Full-puzzle celebration with falling/cheer flower petals and finish time.
class PuzzleWinDialog extends StatefulWidget {
  const PuzzleWinDialog(
      {super.key,
      required this.elapsed,
      this.wordsSolved,
    this.gameName,
    this.scriptureReference,
      this.points,
      this.title,
      this.message,
      this.buttonLabel = 'Continue'});

  final Duration elapsed;
  final int? wordsSolved;
  final String? gameName;
  final String? scriptureReference;
  final int? points;

  /// Overrides for games other than the crossword (e.g. Match).
  final String? title;
  final String? message;
  final String buttonLabel;

  @override
  State<PuzzleWinDialog> createState() => _PuzzleWinDialogState();
}

class _PuzzleWinDialogState extends State<PuzzleWinDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final timeLabel = GameController.formatPuzzleElapsed(widget.elapsed);
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
      child: SizedBox(
        width: 340,
        height: 470,
        child: CelebrationFlowers(
          child: Material(
            color: Colors.white,
            elevation: 8,
            shadowColor: AppColors.navy.withValues(alpha: 0.25),
            borderRadius: BorderRadius.circular(24),
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ScaleTransition(
                      scale: Tween(begin: 0.86, end: 1.06).animate(
                        CurvedAnimation(
                            parent: _pulse, curve: Curves.easeInOut),
                      ),
                      child: Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: AppColors.gold.withValues(alpha: 0.18),
                          shape: BoxShape.circle,
                        ),
                        child: const Center(
                          child: Text('🏆', style: TextStyle(fontSize: 40)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      widget.title ?? 'Puzzle complete!',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 22,
                        color: AppColors.navy,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.message ??
                          cmsText(context, 'messages', 'puzzleSuccess',
                              'Great work finishing this scripture puzzle.'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        height: 1.35,
                        color: AppColors.textMuted,
                      ),
                    ),
                    if (widget.gameName case final name? when name.trim().isNotEmpty)
                      Text(name, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700)),
                    if (widget.scriptureReference case final reference? when reference.trim().isNotEmpty)
                      Text(reference, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.puzzleTealTint,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: AppColors.teal.withValues(alpha: 0.28),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.timer_outlined,
                            size: 20,
                            color: AppColors.teal,
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'Time used  $timeLabel',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                                color: AppColors.navy,
                                fontFeatures: [FontFeature.tabularFigures()],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (widget.wordsSolved != null)
                      Text('Words solved: ${widget.wordsSolved} / ${widget.wordsSolved}'),
                    if (widget.points != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        widget.points! > 0
                            ? '+${widget.points} points earned'
                            : 'No new points this time.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 16,
                          color: AppColors.navy,
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: () => Navigator.pop(context),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.navy,
                          foregroundColor: AppColors.cream,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: Text(
                          widget.buttonLabel,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
