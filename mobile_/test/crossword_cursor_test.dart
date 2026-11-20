import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/models/game_controller.dart';
import 'package:teen_aventure/models/puzzle.dart';
import 'package:teen_aventure/services/content_service.dart';

class _LiveCrosswordService implements ContentService {
  _LiveCrosswordService(this.board);

  LivePuzzleResponse board;

  @override
  Future<LivePuzzleResponse?> getLivePuzzle({String? puzzleId}) async => board;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Across DOM and down DAVID share the leading D — mirrors clue 9 in the wilderness grid.
PuzzleEpisode _crossingEpisode() {
  return PuzzleEpisode(
    id: 'cursor-test',
    episodeNumber: 1,
    title: 'Cursor',
    theme: 'Test',
    gridSize: 5,
    words: [
      PWord(
        number: 9,
        direction: Direction.across,
        answer: 'DOM',
        clue: 'Across',
        ref: '',
        startRow: 0,
        startCol: 0,
      ),
      PWord(
        number: 9,
        direction: Direction.down,
        answer: 'DAVID',
        clue: 'Down',
        ref: '',
        startRow: 0,
        startCol: 0,
      ),
    ],
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('reopening preserves the board until its live revision changes', () async {
    final doc = jsonDecode(
      File('test/fixtures/contracts/fixtures/canonical/jael.canonical.json')
          .readAsStringSync(),
    ) as Map<String, dynamic>;
    LivePuzzleResponse board(String versionId, int day) => LivePuzzleResponse(
          versionId: versionId,
          puzzleKey: 'jael',
          title: 'Jael',
          version: 1,
          lastUpdated: DateTime.utc(2026, 11, day),
          doc: doc,
        );

    final content = _LiveCrosswordService(board('v1', 19));
    final game = GameController();
    addTearDown(game.dispose);
    Future<void> open() => game.loadLiveFromDatabase(
          contentService: content,
          puzzleId: 'puzzle-id',
          keepUnchangedBoard: true,
        );

    await open();
    expect(game.puzzleScreenState, PuzzleScreenState.ready);
    final originalGrid = game.grid;
    await open();
    expect(game.grid, same(originalGrid));

    content.board = board('v1', 20);
    await open();
    expect(game.grid, isNot(same(originalGrid)));
    expect(game.activePuzzleLastUpdated, DateTime.utc(2026, 11, 20));

    final refreshedGrid = game.grid;
    content.board = board('v2', 20);
    await open();
    expect(game.activePuzzleVersionId, 'v2');
    expect(game.grid, isNot(same(refreshedGrid)));
  });

  test('empty GameController stays loading until live puzzle arrives', () {
    final game = GameController();
    expect(game.puzzleScreenState, PuzzleScreenState.loading);
    expect(game.episode.words, isEmpty);
    game.markTechnicalIssue();
    expect(game.puzzleScreenState, PuzzleScreenState.rejected);
    expect(game.puzzleStatusMessage, kPuzzleTechnicalIssueMessage);
  });

  test('selecting a down word skips a locked shared letter to the first empty', () {
    final game = GameController(initialEpisode: _crossingEpisode());
    final across = game.episode.words.firstWhere((w) => w.direction == Direction.across);
    final down = game.episode.words.firstWhere((w) => w.direction == Direction.down);

    game.selectWord(across);
    game.typeLetter('D');
    game.typeLetter('O');
    game.typeLetter('M');
    expect(across.isSolved, isTrue);
    expect(game.grid[0][0].isSolved, isTrue);

    game.selectWord(down);
    expect(game.cursorRow, 1);
    expect(game.cursorCol, 0);
    expect(game.grid[game.cursorRow][game.cursorCol].userLetter, isEmpty);
  });

  test('typing on a locked letter advances without changing it', () {
    final game = GameController(initialEpisode: _crossingEpisode());
    final across = game.episode.words.firstWhere((w) => w.direction == Direction.across);
    final down = game.episode.words.firstWhere((w) => w.direction == Direction.down);

    game.selectWord(across);
    for (final ch in 'DOM'.split('')) {
      game.typeLetter(ch);
    }

    game.activeWord = down;
    game.cursorRow = down.startRow;
    game.cursorCol = down.startCol;
    expect(game.grid[0][0].userLetter, 'D');

    game.typeLetter('D');
    expect(game.grid[0][0].userLetter, 'D');
    expect(game.cursorRow, 1);
    expect(game.cursorCol, 0);

    game.typeLetter('A');
    expect(game.grid[1][0].userLetter, 'A');
    expect(game.cursorRow, 2);
  });
}
