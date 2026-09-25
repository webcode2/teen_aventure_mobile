import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/models/game_controller.dart';

void main() {
  test('watching video 3 first does not mark videos 1 and 2', () {
    final game = GameController();
    game.completeVideoPart(2);
    expect(game.completedVideoParts, 0);
    expect(game.weekVideosDone, 1);
    expect(game.score, 121);
  });

  test('the same video awards points once', () {
    final game = GameController();
    game.completeVideoPart(2);
    game.completeVideoPart(2);
    expect(game.weekVideosDone, 1);
    expect(game.score, 121);
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
}
