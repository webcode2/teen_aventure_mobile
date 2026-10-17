import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/models/matching_controller.dart';
import 'package:teen_aventure/models/puzzle_contract.dart';
import 'package:teen_aventure/models/puzzle_contract_loader.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const loader = PuzzleContractLoader();

  Map<String, dynamic> forgivenessDoc() {
    final file = File('../contracts/fixtures/valid-matching/forgiveness.json');
    expect(file.existsSync(), isTrue);
    return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
  }

  test('forgiveness fixture loads as MatchingData', () {
    final result = loader.loadJson(forgivenessDoc());
    expect(result, isA<PuzzleLoaded>());
    final data = (result as PuzzleLoaded).envelope.data;
    expect(data, isA<MatchingData>());
    final matching = data as MatchingData;
    expect(matching.leftColumn.length, 4);
    expect(matching.correctPairs.length, 4);
  });

  test('MatchingController completes when all correct lines are drawn', () {
    final doc = forgivenessDoc();
    final game = MatchingController();
    expect(game.loadFromDoc(doc, versionId: 'v-test'), isTrue);
    expect(game.screenState, MatchingScreenState.ready);
    expect(game.totalPairs, 4);

    final data = ((loader.loadJson(doc) as PuzzleLoaded).envelope.data) as MatchingData;
    final answerByLeft = {for (final p in data.correctPairs) p.left: p.right};

    for (var left = 0; left < game.leftColumn.length; left++) {
      final sourceRight = answerByLeft[left]!;
      final displayRight = game.rightSourceIndex.indexOf(sourceRight);
      expect(displayRight, greaterThanOrEqualTo(0));
      game.connect(left, displayRight);
      expect(game.locked.containsKey(left), isTrue);
    }

    expect(game.isComplete, isTrue);
    expect(game.solvedCount, 4);
  });

  test('wrong line flashes and does not lock', () {
    final doc = forgivenessDoc();
    final game = MatchingController();
    game.loadFromDoc(doc);

    final data = ((loader.loadJson(doc) as PuzzleLoaded).envelope.data) as MatchingData;
    final correctRight = data.correctPairs.firstWhere((p) => p.left == 0).right;
    final wrongSource = (correctRight + 1) % data.rightColumn.length;
    final wrongDisplay = game.rightSourceIndex.indexOf(wrongSource);

    game.connect(0, wrongDisplay);
    expect(game.locked.containsKey(0), isFalse);
    expect(game.wrongFlash.contains(0), isTrue);
    expect(game.isComplete, isFalse);
  });
}
