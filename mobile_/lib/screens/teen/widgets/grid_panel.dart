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

    return LayoutBuilder(
      builder: (context, constraints) {
        final double availableWidth = constraints.maxWidth - 8.0;
        final double availableHeight = constraints.maxHeight - 8.0;
        final double cellWidth = availableWidth / size;
        final double cellHeight = availableHeight / size;
        final double childAspectRatio = (cellHeight > 0 && cellWidth > 0)
            ? (cellWidth / cellHeight)
            : 1.0;
        final double fontSize = (cellWidth * 0.55).clamp(11.0, 24.0);
        final double clueFontSize = (cellWidth * 0.28).clamp(7.0, 11.0);

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
          child: GridView.builder(
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: size,
              crossAxisSpacing: 2.0,
              mainAxisSpacing: 2.0,
              childAspectRatio: childAspectRatio,
            ),
            itemCount: size * size,
            itemBuilder: (context, index) {
              final r = index ~/ size;
              final c = index % size;
              final cell = game.grid[r][c];

              if (!cell.isLetterCell) {
                return Container(
                  decoration: BoxDecoration(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }

              final isCursor = r == game.cursorRow && c == game.cursorCol;
              final isWordActive = game.activeWord != null && cell.wordIds.contains(game.activeWord!.id);
              final isSolved = cell.isSolved;

              Color bgColor = Colors.white;
              Color borderColor = TeenAppTheme.violet.withOpacity(0.4);

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
                    border: Border.all(color: borderColor, width: isCursor ? 2.5 : 1.2),
                  ),
                  child: Stack(
                    children: [
                      if (cell.clueNumber != null)
                        Positioned(
                          top: 2,
                          left: 2,
                          child: Text(
                            '${cell.clueNumber}',
                            style: TextStyle(
                              fontSize: clueFontSize,
                              fontWeight: FontWeight.w800,
                              color: isCursor ? TeenAppTheme.deepPurple : TeenAppTheme.violet,
                            ),
                          ),
                        ),
                      Center(
                        child: Text(
                          cell.userLetter,
                          style: TextStyle(
                            fontSize: fontSize,
                            fontWeight: FontWeight.w900,
                            color: isSolved ? TeenAppTheme.freshGreen : TeenAppTheme.midnight,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
