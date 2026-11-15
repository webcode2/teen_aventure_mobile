import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/models/game_controller.dart';
import 'package:teen_aventure/screens/shared/widgets/points_total.dart';

void main() {
  test('points are written one way everywhere', () {
    expect(pointsLabel(0), '0 pts');
    expect(pointsLabel(51), '51 pts');
    expect(pointsLabel(1250), '1,250 pts');
    expect(pointsLabel(1000000), '1,000,000 pts');
    expect(pointsLabel(20, signed: true), '+20 pts');
  });

  test('an award shows at once, then the server total replaces it', () async {
    final game = GameController();
    var refreshed = 0;
    game.refreshScore = () async {
      refreshed++;
      game.setAskScore(71, 3);
    };
    game.applyActivityPoints(20);
    expect(refreshed, 1);
    expect(game.score, 71);
  });

  test('no points means no refresh', () {
    final game = GameController();
    var refreshed = 0;
    game.refreshScore = () async => refreshed++;
    game.applyActivityPoints(0);
    expect(refreshed, 0);
  });
}
