import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/models/game_controller.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test("one explorer's ticks do not show for another on the same phone", () async {
    final game = GameController();
    game.startWeek(3, profile: 'parent:ada');
    game.completeVideoPart(0);
    game.completeWeekQuiz();

    game.startWeek(3, profile: 'parent:ben');
    await pumpEventQueue();
    expect(game.weekQuest.videosDone, 0);
    expect(game.weekQuest.quizDone, isFalse);

    game.startWeek(3, profile: 'parent:ada');
    await pumpEventQueue();
    expect(game.weekQuest.videosDone, 1);
    expect(game.weekQuest.quizDone, isTrue);
  });
}
