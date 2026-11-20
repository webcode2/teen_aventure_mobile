import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/models/game_controller.dart';
import 'package:teen_aventure/models/matching_controller.dart';
import 'package:teen_aventure/models/puzzle_contract.dart';
import 'package:teen_aventure/models/puzzle_contract_loader.dart';
import 'package:teen_aventure/screens/teen/matching_screen.dart';
import 'package:teen_aventure/services/api_client.dart';
import 'package:teen_aventure/services/content_service.dart';

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

  test('match deadline blocks connections and retry resets the board', () async {
    final game = MatchingController();
    addTearDown(game.dispose);
    game.loadFromDoc(forgivenessDoc()..['timeLimitSeconds'] = 1);
    game.connect(0, game.rightSourceIndex.indexOf(0));
    expect(game.solvedCount, 1);
    await Future<void>.delayed(const Duration(milliseconds: 1050));
    expect(game.timedOut, isTrue);
    game.connect(1, game.rightSourceIndex.indexOf(2));
    expect(game.solvedCount, 1);

    game.retry();
    expect(game.remaining, const Duration(seconds: 1));
    expect(game.solvedCount, 0);
    game.connect(0, game.rightSourceIndex.indexOf(0));
    expect(game.solvedCount, 1);
  });

  test('undo spends one allowance and leaves every pair a first attempt', () {
    final game = MatchingController();
    addTearDown(game.dispose);
    game.loadFromDoc(forgivenessDoc()..['undoLimit'] = 1);
    int right(int source) => game.rightSourceIndex.indexOf(source);

    game.connect(0, right(2));
    game.connect(0, right(2));
    expect(game.undosRemaining, 1);
    expect(game.canUndo, isTrue);
    game.undoLastMatch();
    expect(game.attempts.containsKey(0), isFalse);
    expect(game.undosRemaining, 0);
    game.connect(0, right(3));
    game.connect(0, right(0));
    expect(game.locked.containsKey(0), isFalse);
    expect(game.undosExhausted, isFalse);

    game.connect(1, right(2));
    game.connect(2, right(3));
    game.connect(3, right(1));
    expect(game.roundScore(10).passed, isTrue);
    expect(game.undosExhausted, isTrue);

    game.retry();
    expect(game.undosRemaining, 1);
    expect(game.roundScore(10).allAttempted, isFalse);
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

  testWidgets('matching screen shows the deadline dialog and restarts the countdown', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final doc = forgivenessDoc()..['timeLimitSeconds'] = 1;
    final content = _MatchingContent(await ApiClient.create(), doc);
    await tester.pumpWidget(Provider<ContentService>.value(
      value: content,
      child: const MaterialApp(home: MatchingScreen(matchingId: 'fixture')),
    ));
    await tester.pumpAndSettle();
    expect(find.text('00:01'), findsOneWidget);
    expect(find.text('left'), findsOneWidget);
    await tester.tap(find.text('Sins'));
    await tester.pump();
    await tester.tap(find.text('Washed'));
    await tester.pump();
    await tester.tap(find.text('Undo last match'));
    await tester.pump();
    expect(find.text('Undos left: 1'), findsOneWidget);
    await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 1050)));
    await tester.pump(const Duration(milliseconds: 250));
    await tester.pumpAndSettle();
    expect(find.text('Keep going!'), findsOneWidget);
    expect(find.text('Forgiven and Cleansed').last, findsOneWidget);
    expect(find.text('You got 0 of 4 pairs right (0%) before time ran out.'), findsOneWidget);
    expect(find.text('Cancel'), findsOneWidget);
    await tester.tap(find.text('Try again'));
    await tester.pumpAndSettle();
    expect(find.text('00:01'), findsOneWidget);
    expect(find.text('Keep going!'), findsNothing);
  });

  testWidgets('match feedback prompts a retry and celebrates all correct pairs', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final content = _MatchingContent(await ApiClient.create(), forgivenessDoc());
    await tester.pumpWidget(MultiProvider(
      providers: [
        Provider<ContentService>.value(value: content),
        ChangeNotifierProvider(create: (_) => GameController()),
      ],
      child: const MaterialApp(home: MatchingScreen(matchingId: 'fixture')),
    ));
    await tester.pumpAndSettle();

    Future<void> match(String left, String right) async {
      await tester.tap(find.text(left));
      await tester.pump();
      await tester.tap(find.text(right));
      await tester.pump();
    }

    await match('Sins', 'Washed');
    expect(find.text('That pair doesn’t match. Use Undo last match to change it.'), findsOneWidget);
    expect(find.text('Well done'), findsNothing);

    await tester.tap(find.text('Undo last match'));
    await tester.pump();
    expect(find.text('Undos left: 1'), findsOneWidget);
    await match('Sins', 'Forgiven');
    expect(find.text('That pair doesn’t match. Use Undo last match to change it.'), findsNothing);
    await match('Transgressions', 'Washed');
    await match('Iniquity', 'Blotted');
    await match('Unrighteousness', 'Cleansed');
    await tester.pump(const Duration(milliseconds: 350));
    expect(find.text('You matched every pair.'), findsOneWidget);
    expect(find.text('Well done'), findsOneWidget);
  });
}


class _MatchingContent extends ContentService {
  _MatchingContent(super.apiClient, this.doc);

  final Map<String, dynamic> doc;

  @override
  Future<LiveMatchingResponse?> getLiveMatching({required String matchingId}) async {
    return LiveMatchingResponse(
      versionId: 'fixture-version',
      matchingKey: matchingId,
      title: 'Forgiven and Cleansed',
      version: 1,
      doc: doc,
    );
  }
}
