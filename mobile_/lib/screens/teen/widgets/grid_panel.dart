import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/game_controller.dart';
import '../../../theme.dart';

class GridPanel extends StatelessWidget {
  const GridPanel({super.key});

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

        return Container(
          width: double.infinity,
          height: double.infinity,
          padding: const EdgeInsets.all(4.0),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: AppRadii.cardRadius,
            boxShadow: [
              BoxShadow(
                color: TeenAppTheme.midnight.withOpacity(0.12),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: InteractiveViewer(
            panEnabled: true,
            scaleEnabled: false,
            constrained: false,
            alignment: Alignment.center,
            boundaryMargin: const EdgeInsets.all(64),
            child: SizedBox(
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
                  var borderColor = TeenAppTheme.violet.withOpacity(0.4);

                  if (isSolved) {
                    bgColor = TeenAppTheme.freshGreen.withOpacity(0.25);
                    borderColor = TeenAppTheme.freshGreen;
                  } else if (isCursor) {
                    bgColor = TeenAppTheme.gold;
                    borderColor = TeenAppTheme.deepPurple;
                  } else if (isWordActive) {
                    bgColor = TeenAppTheme.lavender;
                    borderColor = TeenAppTheme.violet;
                  }

                  return GestureDetector(
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
