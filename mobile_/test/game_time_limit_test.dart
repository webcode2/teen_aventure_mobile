import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/models/game_controller.dart';
import 'package:teen_aventure/models/game_time_limit.dart';
import 'package:teen_aventure/models/puzzle.dart';
import 'package:teen_aventure/screens/teen/puzzle_screen.dart';
import 'package:teen_aventure/screens/teen/widgets/grid_panel.dart';
import 'package:teen_aventure/screens/teen/widgets/puzzle_win_dialog.dart';

void main() {
  test('remaining time reaches zero only at the actual deadline', () {
    expect(remainingGameTime(null, Duration.zero), isNull);
    expect(remainingGameTime(1, const Duration(milliseconds: 999)),
        const Duration(seconds: 1));
    expect(remainingGameTime(1, const Duration(seconds: 1)), Duration.zero);
  });

  test('score uses the supplied maximum and remains unknown without one', () {
    const answers = [0, 2, 3, 0];
    expect(const GameRoundScore(correct: 3, answers: answers, maxPoints: 20).points, 15);
    expect(const GameRoundScore(correct: 3, answers: answers, maxPoints: null).points, isNull);
  });

  testWidgets('crossword shows the published limit, spends clues, and celebrates once', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final episode = PuzzleEpisode(
      id: 'published-crossword', episodeNumber: 1, title: 'Scripture Challenge',
      theme: '', gridSize: 3, words: [
        PWord(number: 1, direction: Direction.across, answer: 'JOY',
            clue: 'A glad feeling', ref: 'Psalm 16:11', startRow: 0, startCol: 0),
      ],
    );
    final game = GameController(initialEpisode: episode);
    game.loadEpisode(episode, timeLimitSeconds: 60, hintGems: 1);
    addTearDown(game.dispose);
    await tester.pumpWidget(ChangeNotifierProvider.value(
      value: game, child: const MaterialApp(home: PuzzleScreen()),
    ));
    await tester.pump();
    expect(find.text('01:00'), findsOneWidget);
    expect(find.text('left'), findsOneWidget);
    expect(game.clueGemsRemaining, 1);
    game.useHint();
    game.useHint();
    expect(game.clueGemsRemaining, 0);
    expect(game.grid[0][0].userLetter, 'J');
    expect(game.grid[0][1].userLetter, isEmpty);

    game.selectCell(0, 1);
    game.typeLetter('O');
    game.typeLetter('Y');
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));
    expect(find.text('Well done, Explorer!'), findsOneWidget);
    expect(find.text('Scripture Challenge'), findsOneWidget);
    expect(find.text('Words solved: 1 / 1'), findsOneWidget);
    expect(find.descendant(of: find.byType(PuzzleWinDialog), matching: find.text('Psalm 16:11')), findsOneWidget);
    expect(find.text('Amen!'), findsNothing);
    expect(game.clueGemsRemaining, 0);
  });

  testWidgets('crossword pans offscreen cursor cells into both axes', (tester) async {
    final game = GameController(initialEpisode: PuzzleEpisode(
      id: 'wide-grid', episodeNumber: 1, title: 'Wide grid', theme: '', gridSize: 12,
      words: [
        PWord(number: 1, direction: Direction.across, answer: 'ABCDEFGHIJKL',
            clue: 'Across', ref: 'Psalm 1', startRow: 0, startCol: 0),
        PWord(number: 1, direction: Direction.down, answer: 'ABCDEFGHIJKL',
            clue: 'Down', ref: 'Psalm 1', startRow: 0, startCol: 0),
      ],
    ));
    addTearDown(game.dispose);
    await tester.pumpWidget(ChangeNotifierProvider.value(
      value: game,
      child: const MaterialApp(home: Scaffold(body: Center(
        child: SizedBox(width: 210, height: 125, child: GridPanel()),
      ))),
    ));
    final viewport = tester.getRect(find.byType(InteractiveViewer));
    for (final (row, col) in [(0, 11), (11, 0)]) {
      game.selectCell(row, col);
      await tester.pump();
      await tester.pump();
      final target = tester.getRect(find.byKey(ValueKey('crossword-cell-$row-$col')));
      expect(viewport.contains(target.center), isTrue);
    }
  });

  testWidgets('crossword locks at zero and supports retry and cancel', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final episode = PuzzleEpisode(
      id: 'timed-test',
      episodeNumber: 1,
      title: 'Timed crossword',
      theme: '',
      gridSize: 3,
      words: [
        PWord(
          number: 1,
          direction: Direction.across,
          answer: 'JOY',
          clue: 'A glad feeling',
          ref: 'Psalm 16:11',
          startRow: 0,
          startCol: 0,
        ),
      ],
    );
    final game = GameController(initialEpisode: episode);
    game.loadEpisode(episode, timeLimitSeconds: 1, hintGems: 2);
    addTearDown(game.dispose);
    await tester.pumpWidget(ChangeNotifierProvider.value(
      value: game,
      child: MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.push<void>(
                context,
                MaterialPageRoute(builder: (_) => const PuzzleScreen()),
              ),
              child: const Text('Open game'),
            ),
          ),
        ),
      ),
    ));
    await tester.tap(find.text('Open game'));
    await tester.pumpAndSettle();
    expect(find.text('00:01'), findsOneWidget);
    game.useHint();
    expect(game.clueGemsRemaining, 1);

    Future<void> expire() async {
      await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 1050)));
      await tester.pump(const Duration(milliseconds: 250));
      await tester.pumpAndSettle();
      expect(find.text('Keep going!'), findsOneWidget);
      expect(find.text('Timed crossword'), findsOneWidget);
      expect(find.text('You got 0 of 1 word right (0%) before time ran out.'), findsOneWidget);
    }

    await expire();
    game.typeLetter('O');
    expect(game.grid[0][1].userLetter, isEmpty);
    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    expect(game.grid[0][0].userLetter, isEmpty);
    expect(find.text('00:01'), findsOneWidget);
    expect(game.clueGemsRemaining, 2);

    await expire();
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.text('Open game'), findsOneWidget);
  });
}
