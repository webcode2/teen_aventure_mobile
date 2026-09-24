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
    expect(pins.first.y, closeTo(LevelMapData.roadBottomY, 1));
    expect(pins.last.y, closeTo(LevelMapData.roadTopY, 1));
    expect(pins.first.x, closeTo(LevelMapData.roadBottomX, 1));
    expect(pins.last.x, closeTo(LevelMapData.roadTopX, 1));

    expect(pins[25].status, LevelStatus.completed);
    expect(pins[26].status, LevelStatus.current);
    expect(pins[27].status, LevelStatus.locked);
    expect(pins.first.checkpoint, isTrue);
    expect(pins[6].checkpoint, isTrue);
    expect(pins.last.checkpoint, isTrue);
    expect(pins[1].checkpoint, isFalse);

    for (var i = 1; i < pins.length; i++) {
      expect(pins[i].y, lessThan(pins[i - 1].y));
      expect(
        (Offset(pins[i].x, pins[i].y) - Offset(pins[i - 1].x, pins[i - 1].y))
            .distance,
        greaterThan(400),
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
}
