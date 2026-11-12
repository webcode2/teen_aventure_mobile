import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/game_controller.dart';
import '../../models/matching_controller.dart';
import '../../services/content_service.dart';
import '../../theme.dart';
import 'week_quest_flow.dart';
import 'widgets/puzzle_status_cards.dart';
import 'widgets/puzzle_win_dialog.dart';
import '../../models/api_models.dart' show TeenQuest;

/// Drawable match-pairs game: drag (or tap) lines from left words to right words.
class MatchingScreen extends StatefulWidget {
  const MatchingScreen({super.key, required this.matchingId});

  final String matchingId;

  @override
  State<MatchingScreen> createState() => _MatchingScreenState();
}

class _MatchingScreenState extends State<MatchingScreen> {
  late final MatchingController _game;
  final GlobalKey _boardKey = GlobalKey();
  final List<GlobalKey> _leftKeys = [];
  final List<GlobalKey> _rightKeys = [];
  Timer? _clock;
  bool _handledWin = false;
  bool _leaving = false;

  @override
  void initState() {
    super.initState();
    _game = MatchingController();
    _clock = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted &&
          _game.screenState == MatchingScreenState.ready &&
          !_game.isComplete) {
        setState(() {});
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final content = context.read<ContentService>();
      _game.loadLive(matchingId: widget.matchingId, contentService: content);
    });
    _game.addListener(_onGame);
  }

  void _onGame() {
    if (!mounted) return;
    if (_game.screenState == MatchingScreenState.loading) {
      _leftKeys.clear();
      _rightKeys.clear();
      _handledWin = false;
    }
    _ensureKeys();
    setState(() {});
    if (_game.isComplete && !_handledWin && !_leaving) {
      _handledWin = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !_leaving) _onWin();
      });
    }
  }

  void _ensureKeys() {
    while (_leftKeys.length < _game.leftColumn.length) {
      _leftKeys.add(GlobalKey());
    }
    if (_leftKeys.length > _game.leftColumn.length) {
      _leftKeys.removeRange(_game.leftColumn.length, _leftKeys.length);
    }
    while (_rightKeys.length < _game.rightDisplay.length) {
      _rightKeys.add(GlobalKey());
    }
    if (_rightKeys.length > _game.rightDisplay.length) {
      _rightKeys.removeRange(_game.rightDisplay.length, _rightKeys.length);
    }
  }

  Future<void> _onWin() async {
    if (!mounted) return;
    // Record first, so the results show the points this match earned.
    final points = await _record();
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => PuzzleWinDialog(
        elapsed: _game.elapsed,
        points: points,
        title: '${TeenQuest.matchGameTitle} complete!',
        message: 'You matched every pair.',
        buttonLabel: 'Well done',
      ),
    );
    if (!mounted) return;
    await _goHome();
  }

  bool _recorded = false;
  int? _recordedPoints;

  Future<int?> _record() async {
    if (_recorded) return _recordedPoints;
    _recorded = true;
    try {
      _recordedPoints = await WeekQuestFlow.recordMatchingIfSolved(context, _game);
    } catch (_) {}
    return _recordedPoints;
  }

  Future<void> _goHome() async {
    if (_leaving) return;
    _leaving = true;
    await _record();
    if (!mounted) return;
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  Widget _backButton() {
    return TextButton.icon(
      onPressed: () => Navigator.maybePop(context),
      icon: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
      label: const Text('Back', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      style: TextButton.styleFrom(
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        minimumSize: const Size(48, 48),
        tapTargetSize: MaterialTapTargetSize.padded,
      ),
    );
  }

  @override
  void dispose() {
    _clock?.cancel();
    _game.removeListener(_onGame);
    _game.dispose();
    super.dispose();
  }

  Offset? _centerOf(GlobalKey key) {
    final box = key.currentContext?.findRenderObject() as RenderBox?;
    final board = _boardKey.currentContext?.findRenderObject() as RenderBox?;
    if (box == null || board == null || !box.hasSize) return null;
    final global = box.localToGlobal(box.size.center(Offset.zero));
    return board.globalToLocal(global);
  }

  int? _hitRight(Offset global) {
    for (var i = 0; i < _rightKeys.length; i++) {
      final box = _rightKeys[i].currentContext?.findRenderObject() as RenderBox?;
      if (box == null || !box.hasSize) continue;
      final topLeft = box.localToGlobal(Offset.zero);
      final rect = topLeft & box.size;
      if (rect.inflate(8).contains(global)) return i;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    switch (_game.screenState) {
      case MatchingScreenState.loading:
        return Scaffold(
          body: Container(
            decoration: TeenAppTheme.headerGradient,
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _backButton(),
                  const Expanded(child: Center(child: CircularProgressIndicator(color: Colors.white))),
                ],
              ),
            ),
          ),
        );
      case MatchingScreenState.rejected:
        return Scaffold(
          body: Container(
            decoration: TeenAppTheme.headerGradient,
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _backButton(),
                  Expanded(
                    child: PuzzleRejectCard(
                      message: _game.statusMessage ??
                          'A technical issue was encountered while loading this match game.',
                      onRetry: () {
                        _handledWin = false;
                        final content = context.read<ContentService>();
                        _game.loadLive(
                          matchingId: widget.matchingId,
                          contentService: content,
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      case MatchingScreenState.ready:
        break;
    }

    final elapsedLabel = GameController.formatPuzzleElapsed(_game.elapsed);
    final progress = _game.totalPairs == 0 ? 0.0 : _game.solvedCount / _game.totalPairs;

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
                    _backButton(),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: progress,
                          backgroundColor: Colors.white24,
                          valueColor: const AlwaysStoppedAnimation<Color>(
                            TeenAppTheme.freshGreen,
                          ),
                          minHeight: 6,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      elapsedLabel,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        _game.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: TeenAppTheme.gold,
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                    ),
                    Text(
                      '${_game.solvedCount}/${_game.totalPairs}',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: TeenAppTheme.cream,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                        child: Text(
                          _game.prompt,
                          style: const TextStyle(
                            color: AppColors.navy,
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            height: 1.35,
                          ),
                        ),
                      ),
                      if (_game.ref.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                          child: Text(
                            _game.ref,
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      Expanded(
                        child: LayoutBuilder(
                          builder: (context, constraints) {
                            return Listener(
                              onPointerMove: (e) {
                                if (_game.dragFromLeft == null) return;
                                _game.updateDrag(e.position);
                              },
                              onPointerUp: (e) {
                                if (_game.dragFromLeft == null) return;
                                final hit = _hitRight(e.position);
                                final from = _game.dragFromLeft!;
                                if (hit != null) {
                                  _game.connect(from, hit);
                                } else {
                                  _game.cancelDrag();
                                }
                              },
                              onPointerCancel: (_) => _game.cancelDrag(),
                              child: Stack(
                                key: _boardKey,
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Expanded(
                                          child: _ColumnWords(
                                            words: _game.leftColumn,
                                            keys: _leftKeys,
                                            side: _ChipSide.left,
                                            lockedDisplayByLeft: _game.locked,
                                            wrongFlash: _game.wrongFlash,
                                            selectedLeft: _game.selectedLeft,
                                            onLeftDown: (i, global) {
                                              _game.beginDrag(i, global);
                                            },
                                            onLeftTap: _game.selectLeft,
                                          ),
                                        ),
                                        const SizedBox(width: 56),
                                        Expanded(
                                          child: _ColumnWords(
                                            words: _game.rightDisplay,
                                            keys: _rightKeys,
                                            side: _ChipSide.right,
                                            lockedDisplayByLeft: _game.locked,
                                            wrongFlash: _game.wrongFlash,
                                            selectedLeft: _game.selectedLeft,
                                            onRightTap: _game.tapRight,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Positioned.fill(
                                    child: IgnorePointer(
                                      child: CustomPaint(
                                        painter: _MatchLinesPainter(
                                          leftCenters: [
                                            for (var i = 0; i < _game.leftColumn.length; i++)
                                              i < _leftKeys.length ? _centerOf(_leftKeys[i]) : null,
                                          ],
                                          rightCenters: [
                                            for (var i = 0; i < _game.rightDisplay.length; i++)
                                              i < _rightKeys.length ? _centerOf(_rightKeys[i]) : null,
                                          ],
                                          locked: Map<int, int>.from(_game.locked),
                                          attempts: Map<int, int>.from(_game.attempts),
                                          wrongFlash: Set<int>.from(_game.wrongFlash),
                                          dragFromLeft: _game.dragFromLeft,
                                          dragPointerLocal: () {
                                            final board = _boardKey.currentContext
                                                ?.findRenderObject() as RenderBox?;
                                            final ptr = _game.dragPointer;
                                            if (board == null || ptr == null) return null;
                                            return board.globalToLocal(ptr);
                                          }(),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        child: _game.isComplete
                            ? FilledButton(
                                onPressed: _goHome,
                                style: FilledButton.styleFrom(
                                  backgroundColor: AppColors.navy,
                                  foregroundColor: AppColors.cream,
                                  minimumSize: const Size.fromHeight(48),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                ),
                                child: const Text('Well done', style: TextStyle(fontWeight: FontWeight.w700)),
                              )
                            : Text(
                                _game.selectedLeft != null
                                    ? 'Tap a word on the right — or drag a line across.'
                                    : 'Drag from a left word to its match on the right.',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _ChipSide { left, right }

class _ColumnWords extends StatelessWidget {
  const _ColumnWords({
    required this.words,
    required this.keys,
    required this.side,
    required this.lockedDisplayByLeft,
    required this.wrongFlash,
    required this.selectedLeft,
    this.onLeftDown,
    this.onLeftTap,
    this.onRightTap,
  });

  final List<String> words;
  final List<GlobalKey> keys;
  final _ChipSide side;
  final Map<int, int> lockedDisplayByLeft;
  final Set<int> wrongFlash;
  final int? selectedLeft;
  final void Function(int index, Offset global)? onLeftDown;
  final void Function(int index)? onLeftTap;
  final void Function(int index)? onRightTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < words.length; i++) ...[
          if (i > 0) const SizedBox(height: 12),
          _MatchChip(
            key: i < keys.length ? keys[i] : null,
            label: words[i],
            side: side,
            selected: side == _ChipSide.left && selectedLeft == i,
            locked: side == _ChipSide.left
                ? lockedDisplayByLeft.containsKey(i)
                : lockedDisplayByLeft.values.contains(i),
            wrong: side == _ChipSide.left && wrongFlash.contains(i),
            onTap: () {
              if (side == _ChipSide.left) {
                onLeftTap?.call(i);
              } else {
                onRightTap?.call(i);
              }
            },
            onPanDown: side == _ChipSide.left
                ? (details) => onLeftDown?.call(i, details.globalPosition)
                : null,
          ),
        ],
      ],
    );
  }
}

class _MatchChip extends StatelessWidget {
  const _MatchChip({
    super.key,
    required this.label,
    required this.side,
    required this.selected,
    required this.locked,
    required this.wrong,
    required this.onTap,
    this.onPanDown,
  });

  final String label;
  final _ChipSide side;
  final bool selected;
  final bool locked;
  final bool wrong;
  final VoidCallback onTap;
  final GestureDragDownCallback? onPanDown;

  @override
  Widget build(BuildContext context) {
    Color border = AppColors.border;
    Color bg = AppColors.surface;
    if (locked) {
      border = TeenAppTheme.freshGreen;
      bg = AppColors.correctFill;
    } else if (wrong) {
      border = const Color(0xFFC23B22);
      bg = const Color(0xFFF8E7DF);
    } else if (selected) {
      border = AppColors.teal;
      bg = AppColors.puzzleTealTint;
    }

    return Material(
      color: bg,
      child: InkWell(
        onTap: onTap,
        onHighlightChanged: (_) {},
        child: GestureDetector(
          onPanDown: onPanDown,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 14),
            decoration: BoxDecoration(
              border: Border.all(color: border, width: selected || locked || wrong ? 2 : 1),
            ),
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.navy,
                fontWeight: FontWeight.w700,
                fontSize: 13,
                decoration: TextDecoration.underline,
                decorationColor: AppColors.navy.withValues(alpha: 0.35),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MatchLinesPainter extends CustomPainter {
  _MatchLinesPainter({
    required this.leftCenters,
    required this.rightCenters,
    required this.locked,
    required this.attempts,
    required this.wrongFlash,
    required this.dragFromLeft,
    required this.dragPointerLocal,
  });

  final List<Offset?> leftCenters;
  final List<Offset?> rightCenters;
  final Map<int, int> locked;
  final Map<int, int> attempts;
  final Set<int> wrongFlash;
  final int? dragFromLeft;
  final Offset? dragPointerLocal;

  @override
  void paint(Canvas canvas, Size size) {
    void drawPair(int left, int right, Color color, {double width = 3}) {
      final a = left < leftCenters.length ? leftCenters[left] : null;
      final b = right < rightCenters.length ? rightCenters[right] : null;
      if (a == null || b == null) return;
      final paint = Paint()
        ..color = color
        ..strokeWidth = width
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;
      final path = Path()
        ..moveTo(a.dx, a.dy)
        ..cubicTo(
          a.dx + (b.dx - a.dx) * 0.35,
          a.dy,
          a.dx + (b.dx - a.dx) * 0.65,
          b.dy,
          b.dx,
          b.dy,
        );
      canvas.drawPath(path, paint);
    }

    for (final entry in locked.entries) {
      drawPair(entry.key, entry.value, TeenAppTheme.freshGreen, width: 3.5);
    }
    for (final entry in attempts.entries) {
      if (locked.containsKey(entry.key)) continue;
      final color = wrongFlash.contains(entry.key)
          ? const Color(0xFFC23B22)
          : AppColors.orange;
      drawPair(entry.key, entry.value, color);
    }

    final from = dragFromLeft;
    final tip = dragPointerLocal;
    if (from != null && tip != null) {
      final a = from < leftCenters.length ? leftCenters[from] : null;
      if (a != null) {
        final paint = Paint()
          ..color = AppColors.teal
          ..strokeWidth = 3
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round;
        canvas.drawLine(a, tip, paint);
        canvas.drawCircle(tip, 4, Paint()..color = AppColors.teal);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _MatchLinesPainter oldDelegate) => true;
}
