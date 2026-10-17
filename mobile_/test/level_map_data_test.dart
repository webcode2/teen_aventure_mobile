import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/data/level_map_data.dart';
import 'package:teen_aventure/models/level_node.dart';

void main() {
  test('levels start at the sea and climb the cream trail to the house', () {
    final pins = buildQuestMapPins(mockLevelProgress());

    expect(pins, hasLength(LevelMapData.levelCount));
    expect(pins.first.id, 1);
    expect(pins.last.id, LevelMapData.levelCount);
    expect(pins.first.y, greaterThan(pins.last.y));
    expect(LevelMapData.levelCount, 52);
    expect(levelSpots, hasLength(LevelMapData.levelCount));
    expect(Offset(pins.first.x, pins.first.y), levelSpots.first);
    expect(Offset(pins.last.x, pins.last.y), levelSpots.last);

    expect(pins[25].status, LevelStatus.completed);
    expect(pins[26].status, LevelStatus.current);
    expect(pins[27].status, LevelStatus.unlocked);
    expect(pins.first.checkpoint, isTrue);
    expect(pins[6].checkpoint, isTrue);
    expect(pins.last.checkpoint, isTrue);
    expect(pins[1].checkpoint, isFalse);

    for (var i = 1; i < pins.length; i++) {
      expect(pins[i].y, lessThan(pins[i - 1].y));
      expect(
        (Offset(pins[i].x, pins[i].y) - Offset(pins[i - 1].x, pins[i - 1].y))
            .distance,
        greaterThan(300),
      );
    }

    final xs = pins.map((p) => p.x);
    expect(xs.reduce(math.max) - xs.reduce(math.min), greaterThan(300));
  });

  test('trail samples run bottom to top', () {
    final spots = sampleQuestTrail(2);
    expect(spots.first.dy, greaterThan(spots.last.dy));
    expect(spots.first, roadPoint(0));
    expect(spots.last, roadPoint(1));
  });

  test('equal pin lists compare by value', () {
    final a = buildQuestMapPins(mockLevelProgress());
    final b = buildQuestMapPins(mockLevelProgress());
    expect(a, b);
    expect(a.first, b.first);
  });

  test('highest level marks current; future weeks are unlocked for play', () {
    final rows = levelProgressForHighest(highestLevelId: 3, totalLevels: 52);
    expect(rows[0].status, LevelStatus.completed);
    expect(rows[1].status, LevelStatus.completed);
    expect(rows[2].status, LevelStatus.current);
    expect(rows[3].status, LevelStatus.unlocked);
    expect(rows[10].status, LevelStatus.unlocked);
    expect(currentLevelIdOf(rows), 3);
  });

  test('jump-ahead notice warns about no points', () {
    expect(
      jumpAheadPointsNotice(
        tappedWeek: 5,
        sequentialWeek: 3,
        caughtUp: false,
        currentWeekComplete: false,
      ),
      contains('still on Quest 3'),
    );
    expect(
      jumpAheadPointsNotice(
        tappedWeek: 5,
        sequentialWeek: 3,
        caughtUp: false,
        currentWeekComplete: true,
      ),
      contains('Quest 3 next'),
    );
    expect(
      jumpAheadPointsNotice(
        tappedWeek: 5,
        sequentialWeek: 3,
        caughtUp: false,
      ),
      contains('no points'),
    );
    expect(
      jumpAheadPointsNotice(tappedWeek: 3, sequentialWeek: 3, caughtUp: false),
      isNull,
    );
    expect(
      jumpAheadPointsNotice(tappedWeek: 5, sequentialWeek: 52, caughtUp: true),
      isNull,
    );
  });
}
