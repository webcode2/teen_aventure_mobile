import '../../../providers/cms_text.dart';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../models/game_controller.dart';
import '../../../theme.dart';

/// Full-puzzle celebration with falling/cheer flower petals and finish time.
class PuzzleWinDialog extends StatefulWidget {
  const PuzzleWinDialog(
      {super.key,
      required this.elapsed,
      this.wordsSolved,
      this.points,
      this.title,
      this.message,
      this.buttonLabel = 'Continue'});

  final Duration elapsed;
  final int? wordsSolved;
  final int? points;
  /// Overrides for games other than the crossword (e.g. Match).
  final String? title;
  final String? message;
  final String buttonLabel;

  @override
  State<PuzzleWinDialog> createState() => _PuzzleWinDialogState();
}

class _PuzzleWinDialogState extends State<PuzzleWinDialog>
    with TickerProviderStateMixin {
  late final AnimationController _burst;
  late final AnimationController _pulse;
  late final List<_Flower> _flowers;

  static const _glyphs = ['🌸', '🌺', '🌼', '🌻', '💮', '🏵️'];

  @override
  void initState() {
    super.initState();
    final rng = math.Random();
    _flowers = List.generate(18, (i) {
      final angle = (i / 18) * math.pi * 2 + rng.nextDouble() * 0.35;
      return _Flower(
        glyph: _glyphs[i % _glyphs.length],
        angle: angle,
        distance: 70 + rng.nextDouble() * 110,
        size: 18 + rng.nextDouble() * 16,
        spin: (rng.nextDouble() - 0.5) * 2.4,
        delay: rng.nextDouble() * 0.25,
      );
    });
    _burst = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..forward();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _burst.dispose();
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
        child: Stack(
          alignment: Alignment.center,
          clipBehavior: Clip.none,
          children: [
            // Half the flowers burst behind the card, half fly over it.
            _flowerLayer(behind: true),
            Material(
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
                            Text(
                              'Time  $timeLabel',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                                color: AppColors.navy,
                                fontFeatures: [FontFeature.tabularFigures()],
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (widget.wordsSolved != null)
                        Text('${widget.wordsSolved} words solved'),
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
            _flowerLayer(behind: false),
          ],
        ),
      ),
    );
  }

  Widget _flowerLayer({required bool behind}) {
    // The front layer lets taps through to the card's button.
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _burst,
        builder: (context, _) {
          return Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              for (var i = 0; i < _flowers.length; i++)
                if (i.isEven == behind) _FlowerBurst(flower: _flowers[i], t: _burst.value),
            ],
          );
        },
      ),
    );
  }
}

class _Flower {
  const _Flower({
    required this.glyph,
    required this.angle,
    required this.distance,
    required this.size,
    required this.spin,
    required this.delay,
  });

  final String glyph;
  final double angle;
  final double distance;
  final double size;
  final double spin;
  final double delay;
}

class _FlowerBurst extends StatelessWidget {
  const _FlowerBurst({required this.flower, required this.t});

  final _Flower flower;
  final double t;

  @override
  Widget build(BuildContext context) {
    final local = ((t - flower.delay) / (1 - flower.delay)).clamp(0.0, 1.0);
    final eased = Curves.easeOutCubic.transform(local);
    final dx = math.cos(flower.angle) * flower.distance * eased;
    final dy = math.sin(flower.angle) * flower.distance * eased -
        40 * math.sin(eased * math.pi);
    final opacity = (1.0 - eased * 0.35).clamp(0.0, 1.0);
    return Transform.translate(
      offset: Offset(dx, dy),
      child: Transform.rotate(
        angle: flower.spin * eased * math.pi,
        child: Opacity(
          opacity: opacity,
          child: Text(
            flower.glyph,
            style: TextStyle(fontSize: flower.size),
          ),
        ),
      ),
    );
  }
}
