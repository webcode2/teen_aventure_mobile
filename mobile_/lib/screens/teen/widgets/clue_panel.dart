import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/game_controller.dart';
import '../../../models/puzzle.dart';
import '../../../theme.dart';

class CluePanel extends StatefulWidget {
  const CluePanel({super.key});

  @override
  State<CluePanel> createState() => _CluePanelState();
}

class _CluePanelState extends State<CluePanel> {
  Direction _selectedTab = Direction.across;

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameController>();
    final words = game.episode.words
        .where((w) => w.direction == _selectedTab)
        .toList();

    final acrossCount = game.episode.words.where((w) => w.direction == Direction.across).length;
    final downCount = game.episode.words.where((w) => w.direction == Direction.down).length;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppRadii.cardRadius,
        boxShadow: [
          BoxShadow(
            color: TeenAppTheme.midnight.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          // Across / Down Tab Selector
          Container(
            margin: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: TeenAppTheme.cream,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedTab = Direction.across),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: _selectedTab == Direction.across ? TeenAppTheme.violet : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Center(
                        child: Text(
                          'ACROSS ($acrossCount)',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                            color: _selectedTab == Direction.across ? Colors.white : TeenAppTheme.midnight,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedTab = Direction.down),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: _selectedTab == Direction.down ? TeenAppTheme.violet : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Center(
                        child: Text(
                          'DOWN ($downCount)',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                            color: _selectedTab == Direction.down ? Colors.white : TeenAppTheme.midnight,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Scrollable Clue List linked 2-way with grid
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              itemCount: words.length,
              separatorBuilder: (_, __) => const SizedBox(height: 4),
              itemBuilder: (context, index) {
                final word = words[index];
                final isActive = game.activeWord?.id == word.id;
                final isSolved = word.isSolved;

                return InkWell(
                  onTap: () {
                    if (word.direction != _selectedTab) {
                      setState(() => _selectedTab = word.direction);
                    }
                    game.selectWord(word);
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: isActive
                          ? TeenAppTheme.lavender
                          : (isSolved ? TeenAppTheme.freshGreen.withOpacity(0.1) : Colors.transparent),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isActive ? TeenAppTheme.violet : Colors.transparent,
                        width: 1.5,
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(5),
                          decoration: BoxDecoration(
                            color: isActive ? TeenAppTheme.violet : TeenAppTheme.lavender,
                            shape: BoxShape.circle,
                          ),
                          child: Text(
                            '${word.number}',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: isActive ? Colors.white : TeenAppTheme.violet,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                word.clue,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                                  color: isSolved ? TeenAppTheme.freshGreen : TeenAppTheme.midnight,
                                  decoration: isSolved ? TextDecoration.lineThrough : null,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                word.ref,
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: TeenAppTheme.deepPurple,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (isSolved)
                          const Padding(
                            padding: EdgeInsets.only(left: 4),
                            child: Icon(Icons.check_circle, color: TeenAppTheme.freshGreen, size: 18),
                          )
                        else if (isActive)
                          const Padding(
                            padding: EdgeInsets.only(left: 4),
                            child: Icon(Icons.arrow_right, color: TeenAppTheme.violet, size: 20),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
