import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/game_controller.dart';
import '../../../models/puzzle.dart';
import '../../../theme.dart';

class CustomKeyboard extends StatelessWidget {
  const CustomKeyboard({super.key});

  static const List<List<String>> _rows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['⌫', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '💡'],
  ];

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameController>();
    final activeWord = game.activeWord;

    return Container(
      color: TeenAppTheme.midnight,
      padding: const EdgeInsets.only(top: 6, bottom: 12, left: 4, right: 4),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Active Clue Banner Above Keyboard
          if (activeWord != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              margin: const EdgeInsets.only(bottom: 6),
              decoration: BoxDecoration(
                color: TeenAppTheme.deepPurple.withOpacity(0.9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Text(
                    '${activeWord.number}${activeWord.direction == Direction.across ? "A" : "D"} ▸ ',
                    style: const TextStyle(
                      color: TeenAppTheme.gold,
                      fontWeight: FontWeight.w900,
                      fontSize: 12,
                    ),
                  ),
                  Expanded(
                    child: Text(
                      '${activeWord.clue} (${activeWord.ref})',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),

          // QWERTY Keys
          for (final row in _rows)
            Row(
              children: [
                for (final key in row)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(2.5),
                      child: Material(
                        color: key == '💡'
                            ? TeenAppTheme.gold
                            : (key == '⌫' ? TeenAppTheme.violet : Colors.white),
                        borderRadius: BorderRadius.circular(7),
                        child: InkWell(
                          onTap: () {
                            if (key == '⌫') {
                              game.backspace();
                            } else if (key == '💡') {
                              game.useHint();
                            } else {
                              game.typeLetter(key);
                            }
                          },
                          borderRadius: BorderRadius.circular(7),
                          child: SizedBox(
                            height: 38,
                            child: Center(
                              child: Text(
                                key,
                                style: TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: key.length == 1 && key != '💡' && key != '⌫' ? 16 : 14,
                                  color: key == '💡'
                                      ? TeenAppTheme.midnight
                                      : (key == '⌫' ? Colors.white : TeenAppTheme.midnight),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}
