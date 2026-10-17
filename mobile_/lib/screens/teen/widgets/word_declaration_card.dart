import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../data/quest_points.dart';
import '../../../models/auth_session.dart';
import '../../../models/game_controller.dart';
import '../../../services/content_service.dart';
import '../../../theme.dart';

class WordDeclarationCard extends StatefulWidget {
  const WordDeclarationCard({
    super.key,
    required this.declaration,
    required this.reference,
    required this.refKey,
    this.title = 'Word Declaration',
    this.targetTaps = 10,
  });

  final String title;
  final String declaration;
  final String reference;
  final int targetTaps;
  final String refKey;

  @override
  State<WordDeclarationCard> createState() => _WordDeclarationCardState();
}

class _WordDeclarationCardState extends State<WordDeclarationCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _press;
  late final Animation<double> _scale;
  int _burstId = 0;
  int _tapCount = 0;
  bool _awarded = false;

  @override
  void initState() {
    super.initState();
    _press = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );
    _scale = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 1, end: 0.96), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 0.96, end: 1.04), weight: 1),
      TweenSequenceItem(tween: Tween(begin: 1.04, end: 1), weight: 1),
    ]).animate(CurvedAnimation(parent: _press, curve: Curves.easeOut));
  }

  @override
  void dispose() {
    _press.dispose();
    super.dispose();
  }

  bool get _complete => _tapCount >= widget.targetTaps;

  void _onTap() {
    if (_complete) {
      HapticFeedback.selectionClick();
      _press.forward(from: 0);
      setState(() => _burstId++);
      return;
    }

    HapticFeedback.lightImpact();
    _press.forward(from: 0);
    setState(() {
      _tapCount += 1;
      _burstId++;
    });

    if (_tapCount >= widget.targetTaps) {
      HapticFeedback.mediumImpact();
      _awardIfNeeded();
    }
  }

  void _awardIfNeeded() {
    if (_awarded) return;
    _awarded = true;
    try {
      final childId = context.read<AuthSession>().effectiveChildId;
      final game = context.read<GameController>();
      context
          .read<ContentService>()
          .markPrayerDeclared(refKey: widget.refKey, childId: childId)
          .then((award) {
        if (award.awardedFresh) {
          game.applyActivityPoints(award.points);
        } else if (!award.ok) {
          game.addScoreAndGems(QuestPoints.prayer, 1);
        }
      });
    } catch (_) {
      try {
        context.read<GameController>().addScoreAndGems(QuestPoints.prayer, 1);
      } catch (_) {}
    }
  }

  @override
  Widget build(BuildContext context) {
    final progress = (_tapCount / widget.targetTaps).clamp(0.0, 1.0);
    final statusLabel = _complete
        ? 'Declared!  ·  ${widget.targetTaps}/${widget.targetTaps}'
        : '— ${widget.reference}  ·  $_tapCount/${widget.targetTaps}  ·  Tap ';

    return Stack(
      clipBehavior: Clip.none,
      children: [
        ScaleTransition(
          scale: _scale,
          child: Material(
            color: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: AppRadii.cardRadius,
              side: BorderSide(
                color: _complete ? AppColors.forestGreen : AppColors.border,
                width: _complete ? 1.5 : 1,
              ),
            ),
            child: InkWell(
              key: const ValueKey('word-declaration-card'),
              onTap: _onTap,
              borderRadius: AppRadii.cardRadius,
              splashColor: AppColors.orange.withValues(alpha: 0.28),
              highlightColor: AppColors.teal.withValues(alpha: 0.12),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SpeechBubbleIcon(),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  widget.title,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                    color: AppColors.navy,
                                  ),
                                ),
                              ),
                              _TapCounterBadge(
                                count: _tapCount,
                                target: widget.targetTaps,
                                complete: _complete,
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.declaration,
                            style: const TextStyle(
                              fontSize: 13,
                              height: 1.35,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 10),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: progress,
                              minHeight: 6,
                              backgroundColor: AppColors.border,
                              color: _complete
                                  ? AppColors.forestGreen
                                  : AppColors.orange,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            statusLabel,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: AppColors.forestGreen,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (_burstId > 0)
          Positioned.fill(
            child: IgnorePointer(
              child: _DeclarationBurst(
                key: ValueKey(_burstId),
                text: widget.declaration,
                countLabel: '$_tapCount/${widget.targetTaps}',
              ),
            ),
          ),
      ],
    );
  }
}

class _TapCounterBadge extends StatelessWidget {
  const _TapCounterBadge({
    required this.count,
    required this.target,
    required this.complete,
  });

  final int count;
  final int target;
  final bool complete;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: complete
            ? AppColors.forestGreen.withValues(alpha: 0.12)
            : AppColors.orange.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '$count/$target',
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w900,
          color: complete ? AppColors.forestGreen : AppColors.orange,
        ),
      ),
    );
  }
}

class _SpeechBubbleIcon extends StatelessWidget {
  const _SpeechBubbleIcon();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(40, 36),
      painter: _SpeechBubblePainter(
        fill: AppColors.orange,
        tail: AppColors.orange,
      ),
    );
  }
}

class _SpeechBubblePainter extends CustomPainter {
  _SpeechBubblePainter({required this.fill, required this.tail});

  final Color fill;
  final Color tail;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = fill;
    final bubble = RRect.fromLTRBR(
      0,
      0,
      size.width,
      size.height * 0.78,
      const Radius.circular(12),
    );
    canvas.drawRRect(bubble, paint);
    final path = Path()
      ..moveTo(size.width * 0.22, size.height * 0.72)
      ..lineTo(size.width * 0.18, size.height)
      ..lineTo(size.width * 0.42, size.height * 0.72)
      ..close();
    canvas.drawPath(path, Paint()..color = tail);
  }

  @override
  bool shouldRepaint(covariant _SpeechBubblePainter oldDelegate) =>
      oldDelegate.fill != fill || oldDelegate.tail != tail;
}

class _DeclarationBurst extends StatefulWidget {
  const _DeclarationBurst({
    super.key,
    required this.text,
    required this.countLabel,
  });

  final String text;
  final String countLabel;

  @override
  State<_DeclarationBurst> createState() => _DeclarationBurstState();
}

class _DeclarationBurstState extends State<_DeclarationBurst>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        final t = Curves.easeOut.transform(_controller.value);
        final fade = (1 - t).clamp(0.0, 1.0);
        return Stack(
          children: [
            _floatingBubble(
              alignment: const Alignment(-0.55, -0.15),
              offset: Offset(-8, -28 * t),
              scale: 0.7 + (0.35 * t),
              opacity: fade,
              label: widget.countLabel,
              compact: true,
            ),
            _floatingBubble(
              alignment: const Alignment(0.05, -0.55),
              offset: Offset(0, -42 * t),
              scale: 0.85 + (0.25 * t),
              opacity: fade,
              label: widget.text,
              compact: false,
            ),
            _floatingBubble(
              alignment: const Alignment(0.62, -0.08),
              offset: Offset(10, -22 * t),
              scale: 0.65 + (0.3 * t),
              opacity: fade,
              label: 'I declare!',
              compact: true,
            ),
          ],
        );
      },
    );
  }

  Widget _floatingBubble({
    required Alignment alignment,
    required Offset offset,
    required double scale,
    required double opacity,
    required String label,
    required bool compact,
  }) {
    return Align(
      alignment: alignment,
      child: Opacity(
        opacity: opacity,
        child: Transform.translate(
          offset: offset,
          child: Transform.scale(
            scale: scale,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: AppColors.navy.withValues(alpha: 0.92),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.orange.withValues(alpha: 0.28),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: compact ? 8 : 12,
                  vertical: compact ? 6 : 8,
                ),
                child: Text(
                  label,
                  maxLines: compact ? 1 : 3,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: compact ? 10 : 11,
                    height: 1.25,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
