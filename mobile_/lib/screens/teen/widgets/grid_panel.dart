import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/game_controller.dart';
import '../../../theme.dart';

class GridPanel extends StatefulWidget {
  const GridPanel({super.key});

  @override
  State<GridPanel> createState() => _GridPanelState();
}

class _GridPanelState extends State<GridPanel> {
  final _transform = TransformationController();
  final _viewportKey = GlobalKey();
  final _boardKey = GlobalKey();
  Object? _lastTarget;

  @override
  void dispose() {
    _transform.dispose();
    super.dispose();
  }

  void _revealCursor(Object target, Rect cell) {
    if (_lastTarget == target) return;
    _lastTarget = target;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _lastTarget != target) return;
      final viewport = _viewportKey.currentContext?.findRenderObject() as RenderBox?;
      final board = _boardKey.currentContext?.findRenderObject() as RenderBox?;
      if (viewport == null || board == null || !viewport.hasSize || !board.hasSize) return;
      final bounds = (viewport.localToGlobal(Offset.zero) & viewport.size).deflate(4);
      final visibleCell = Rect.fromPoints(
        board.localToGlobal(cell.topLeft),
        board.localToGlobal(cell.bottomRight),
      );
      double shift(double start, double end, double min, double max) {
        if (start < min) return min - start;
        if (end > max) return max - end;
        return 0;
      }
      final dx = shift(visibleCell.left, visibleCell.right, bounds.left, bounds.right);
      final dy = shift(visibleCell.top, visibleCell.bottom, bounds.top, bounds.bottom);
      if (dx == 0 && dy == 0) return;
      final matrix = Matrix4.copy(_transform.value);
      matrix.setTranslationRaw(matrix.storage[12] + dx, matrix.storage[13] + dy, matrix.storage[14]);
      _transform.value = matrix;
    });
  }

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameController>();
    final size = game.episode.gridSize;

    var minR = size;
    var maxR = 0;
    var minC = size;
    var maxC = 0;
    var anyLetter = false;
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (!game.grid[r][c].isLetterCell) continue;
        anyLetter = true;
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
    if (!anyLetter) {
      minR = 0;
      maxR = size - 1;
      minC = 0;
      maxC = size - 1;
    }
    final rows = maxR - minR + 1;
    final cols = maxC - minC + 1;

    return LayoutBuilder(
      builder: (context, constraints) {
        const gap = 2.0;
        final availableWidth = constraints.maxWidth - 8.0;
        final cell = (availableWidth / cols).clamp(26.0, 40.0);
        final fontSize = (cell * 0.5).clamp(11.0, 18.0);
        final clueFontSize = (cell * 0.28).clamp(7.0, 11.0);
        final gridW = cols * cell + (cols - 1) * gap;
        final gridH = rows * cell + (rows - 1) * gap;

        if (game.activeWord != null) {
          final x = (game.cursorCol - minC) * (cell + gap);
          final y = (game.cursorRow - minR) * (cell + gap);
          _revealCursor(
            (game.grid, game.cursorRow, game.cursorCol, constraints.biggest),
            Rect.fromLTWH(x, y, cell, cell),
          );
        }
        return Container(
          width: double.infinity,
          height: double.infinity,
          padding: const EdgeInsets.all(4.0),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: AppRadii.cardRadius,
            boxShadow: [
              BoxShadow(
                color: TeenAppTheme.midnight.withValues(alpha: 0.12),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: InteractiveViewer(
            key: _viewportKey,
            transformationController: _transform,
            panEnabled: true,
            scaleEnabled: false,
            constrained: false,
            alignment: Alignment.center,
            boundaryMargin: const EdgeInsets.all(64),
            child: SizedBox(
              key: _boardKey,
              width: gridW,
              height: gridH,
              child: GridView.builder(
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: cols,
                  crossAxisSpacing: gap,
                  mainAxisSpacing: gap,
                  childAspectRatio: 1,
                ),
                itemCount: rows * cols,
                itemBuilder: (context, index) {
                  final r = minR + index ~/ cols;
                  final c = minC + index % cols;
                  final letter = game.grid[r][c];

                  if (!letter.isLetterCell) {
                    return const SizedBox.shrink();
                  }

                  final isCursor = r == game.cursorRow && c == game.cursorCol;
                  final isWordActive = game.activeWord != null &&
                      letter.wordIds.contains(game.activeWord!.id);
                  final isSolved = letter.isSolved;

                  var bgColor = Colors.white;
                  var borderColor = TeenAppTheme.violet.withValues(alpha: 0.4);

                  if (isSolved) {
                    bgColor = TeenAppTheme.freshGreen.withValues(alpha: 0.25);
                    borderColor = TeenAppTheme.freshGreen;
                  } else if (isCursor) {
                    bgColor = TeenAppTheme.gold;
                    borderColor = TeenAppTheme.deepPurple;
                  } else if (isWordActive) {
                    bgColor = TeenAppTheme.lavender;
                    borderColor = TeenAppTheme.violet;
                  }

                  return GestureDetector(
                    key: ValueKey('crossword-cell-$r-$c'),
                    onTap: () => game.selectCell(r, c),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 120),
                      decoration: BoxDecoration(
                        color: bgColor,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: borderColor,
                          width: isCursor ? 2.5 : 1.2,
                        ),
                      ),
                      child: Stack(
                        children: [
                          if (letter.clueNumber != null)
                            Positioned(
                              top: 2,
                              left: 2,
                              child: Text(
                                '${letter.clueNumber}',
                                style: TextStyle(
                                  fontSize: clueFontSize,
                                  fontWeight: FontWeight.w800,
                                  color: isCursor
                                      ? TeenAppTheme.deepPurple
                                      : TeenAppTheme.violet,
                                ),
                              ),
                            ),
                          Center(
                            child: Text(
                              letter.userLetter,
                              style: TextStyle(
                                fontSize: fontSize,
                                fontWeight: FontWeight.w900,
                                color: isSolved
                                    ? TeenAppTheme.freshGreen
                                    : TeenAppTheme.midnight,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }
}
