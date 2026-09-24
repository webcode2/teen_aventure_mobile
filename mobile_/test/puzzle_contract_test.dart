import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/models/game_controller.dart';
import 'package:teen_aventure/models/puzzle.dart';
import 'package:teen_aventure/models/puzzle_contract.dart';
import 'package:teen_aventure/models/puzzle_contract_loader.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const loader = PuzzleContractLoader();

  Map<String, dynamic> readJson(String relativePath) {
    final file = File(relativePath);
    expect(file.existsSync(), isTrue, reason: 'Missing $relativePath');
    return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
  }

  group('canonical goldens', () {
    for (final name in ['jael', 'wilderness', 'esther']) {
      test('$name.canonical.json loads as CrosswordData', () {
        final raw = readJson(
          'test/fixtures/contracts/fixtures/canonical/$name.canonical.json',
        );
        final result = loader.loadJson(raw);
        expect(result, isA<PuzzleLoaded>());
        final envelope = (result as PuzzleLoaded).envelope;
        expect(envelope.data, isA<CrosswordData>());
        final episode = loader.episodeOrNull(result);
        expect(episode, isNotNull);
        expect(episode!.words, isNotEmpty);
      });
    }

    test('jael golden: JAEL is 3-Across and plays in GameController', () async {
      SharedPreferences.setMockInitialValues({});
      final raw = readJson(
        'test/fixtures/contracts/fixtures/canonical/jael.canonical.json',
      );
      final result = loader.loadJson(raw);
      final episode = loader.episodeOrNull(result)!;
      final jael = episode.words.firstWhere((w) => w.answer == 'JAEL');
      expect(jael.number, 3);
      expect(jael.direction, Direction.across);

      final game = GameController(initialEpisode: episode);
      expect(game.puzzleScreenState, PuzzleScreenState.ready);
      expect(game.totalWords, episode.words.length);
      // Gameplay path unchanged: select + type does not throw.
      game.selectWord(jael);
      game.typeLetter('J');
      expect(game.grid[jael.startRow][jael.startCol].userLetter, 'J');
      await Future<void>.delayed(Duration.zero);
    });
  });

  group('thin guard', () {
    test('collision fixture → PuzzleRejected, no throw', () {
      final raw = readJson(
        'test/fixtures/contracts/fixtures/broken/collision.json',
      );
      // Broken LAYOUT must be compiled in contracts; here simulate a colliding CROSSWORD.
      final colliding = {
        'schemaVersion': 1,
        'id': 'collision-test',
        'type': 'CROSSWORD',
        'title': 'Collision',
        'scripture': 'Test 1:1',
        'rewards': <String, dynamic>{},
        'data': {
          'grid': {'rows': 5, 'cols': 5},
          'entries': [
            {
              'id': 'a1',
              'number': 1,
              'direction': 'across',
              'row': 0,
              'col': 0,
              'answer': 'FAITH',
              'clue': 'Horizontal',
              'ref': 'Hebrews 11:1',
            },
            {
              'id': 'd1',
              'number': 2,
              'direction': 'down',
              'row': 0,
              'col': 2,
              'answer': 'LOVE',
              'clue': 'Collides at I vs L',
              'ref': '1 Corinthians 13:13',
            },
          ],
        },
      };
      expect(() => loader.loadJson(colliding), returnsNormally);
      final result = loader.loadJson(colliding);
      expect(result, isA<PuzzleRejected>());
      expect((result as PuzzleRejected).code, PuzzleRejectCode.collision);

      final game = GameController(initialEpisode: episodeStub());
      expect(() => game.applyLoadResult(result), returnsNormally);
      expect(game.puzzleScreenState, PuzzleScreenState.rejected);

      // Also ensure LAYOUT collision WIP is not treated as a throw when parsed as envelope.
      expect(() => PuzzleEnvelope.parse(raw), returnsNormally);
    });
  });

  group('unsupported', () {
    test('FUTURE_THING → UnsupportedPuzzle, no throw', () {
      final raw = {
        'schemaVersion': 1,
        'id': 'future',
        'type': 'FUTURE_THING',
        'title': 'Future',
        'scripture': 'Test 1:1',
        'rewards': <String, dynamic>{},
        'data': <String, dynamic>{},
      };
      final result = loader.loadJson(raw);
      expect(result, isA<PuzzleLoaded>());
      expect((result as PuzzleLoaded).envelope.data, isA<UnsupportedPuzzle>());
      expect(
        ((result.envelope.data) as UnsupportedPuzzle).rawType,
        'FUTURE_THING',
      );

      final game = GameController(initialEpisode: episodeStub());
      expect(() => game.applyLoadResult(result), returnsNormally);
      expect(game.puzzleScreenState, PuzzleScreenState.unsupported);
    });

    test('schemaVersion 99 → UnsupportedPuzzle, no throw', () {
      final raw = {
        'schemaVersion': 99,
        'id': 'too-new',
        'type': 'CROSSWORD',
        'title': 'Too new',
        'scripture': 'Test 1:1',
        'rewards': <String, dynamic>{},
        'data': {
          'grid': {'rows': 2, 'cols': 2},
          'entries': [
            {
              'id': 'a1',
              'number': 1,
              'direction': 'across',
              'row': 0,
              'col': 0,
              'answer': 'AB',
              'clue': 'Letters',
              'ref': 'Test 1:1',
            },
          ],
        },
      };
      final result = loader.loadJson(raw);
      expect(result, isA<PuzzleLoaded>());
      final data = (result as PuzzleLoaded).envelope.data;
      expect(data, isA<UnsupportedPuzzle>());
      expect((data as UnsupportedPuzzle).schemaVersion, 99);
      expect(data.reason, 'schema_too_new');
    });
  });
}

PuzzleEpisode episodeStub() {
  return PuzzleEpisode(
    id: 'stub',
    episodeNumber: 1,
    title: 'Stub',
    theme: 'Test',
    gridSize: 2,
    words: [
      PWord(
        number: 1,
        direction: Direction.across,
        answer: 'AB',
        clue: 'Stub',
        ref: 'Test 1:1',
        startRow: 0,
        startCol: 0,
      ),
    ],
  );
}
