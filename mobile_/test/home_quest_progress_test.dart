import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/models/game_controller.dart';
import 'package:teen_aventure/theme.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('watching video 3 first does not mark videos 1 and 2', () {
    final game = GameController();
    game.completeVideoPart(2);
    expect(game.completedVideoParts, 0);
    expect(game.weekVideosDone, 1);
  });

  test('the same video is marked watched once', () {
    final game = GameController();
    game.completeVideoPart(2);
    game.completeVideoPart(2);
    expect(game.weekVideosDone, 1);
  });

  test('three distinct videos open the quest count', () {
    final game = GameController();
    game.completeVideoPart(0);
    game.completeVideoPart(1);
    game.completeVideoPart(2);
    expect(game.completedVideoParts, 3);
    expect(game.weekVideosDone, 3);
    expect(game.weekQuest.videosCompleted, 3);
  });

  test('quiz completion is marked once', () {
    final game = GameController();
    game.completeWeekQuiz();
    game.completeWeekQuiz();
    expect(game.weekQuizDone, isTrue);
  });

  test('admin ledger points apply to the displayed score', () {
    final game = GameController();
    game.applyActivityPoints(7);
    game.applyActivityPoints(0);
    expect(game.score, 7);
  });

  test('server quiz/puzzle flags block later local scoring marks', () {
    final game = GameController();
    game.startWeek(1, quizDone: true, puzzleDone: true);
    expect(game.weekQuizDone, isTrue);
    expect(game.weekPuzzleDone, isTrue);
    final before = game.score;
    game.completeWeekQuiz();
    game.completeWeekPuzzle();
    expect(game.score, before);
  });

  test('app font bump matches theme constant', () {
    expect(kAppFontBump, 0);
  });

  test('puzzle elapsed formats as mm:ss and hh:mm:ss', () {
    expect(
      GameController.formatPuzzleElapsed(const Duration(seconds: 75)),
      '01:15',
    );
    expect(
      GameController.formatPuzzleElapsed(const Duration(hours: 1, minutes: 2, seconds: 3)),
      '01:02:03',
    );
  });
}
