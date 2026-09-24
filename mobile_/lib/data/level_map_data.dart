import 'dart:math' as math;
import 'dart:ui';

import '../models/level_node.dart';

/// Mock adventure-map data. Swap [mockLevelProgress] for API rows later.
class LevelMapData {
  static const currentLevelId = 27;
  static const levelCount = 54;
  static const checkpointEvery = 6;
  static const mapWidth = 1000.0;
  static const mapHeight = 24000.0;

  /// Cream trail runs from the sea (level 1) up to the castle.
  static const roadBottomX = 500.0;
  static const roadBottomY = 23480.0;
  static const roadTopX = 340.0;
  static const roadTopY = 680.0;
}

class QuestMapPin {
  const QuestMapPin({
    required this.id,
    required this.x,
    required this.y,
    required this.status,
    required this.stars,
    this.checkpoint = false,
  });

  final int id;
  final double x;
  final double y;
  final LevelStatus status;
  final int stars;
  final bool checkpoint;

  Map<String, Object> toJson() => {
        'id': id,
        'x': x,
        'y': y,
        'status': status.name,
        'stars': stars,
        'checkpoint': checkpoint,
      };

  @override
  bool operator ==(Object other) =>
      other is QuestMapPin &&
      id == other.id &&
      x == other.x &&
      y == other.y &&
      status == other.status &&
      stars == other.stars &&
      checkpoint == other.checkpoint;

  @override
  int get hashCode => Object.hash(id, x, y, status, stars, checkpoint);
}

int currentLevelIdOf(List<LevelProgress> progress) {
  for (final row in progress) {
    if (row.status == LevelStatus.current) return row.id;
  }
  return LevelMapData.currentLevelId;
}

List<LevelProgress> mockLevelProgress(
    {int currentLevelId = LevelMapData.currentLevelId}) {
  return [
    for (var id = 1; id <= LevelMapData.levelCount; id++)
      LevelProgress(
        id: id,
        status: id < currentLevelId
            ? LevelStatus.completed
            : id == currentLevelId
                ? LevelStatus.current
                : LevelStatus.locked,
        stars: id < currentLevelId ? (id % 3) + 1 : 0,
      ),
  ];
}

double _lerp(double a, double b, double t) => a + (b - a) * t;

/// t = 0 at the sea, t = 1 at the house. One upward park path with soft S-curves.
Offset roadPoint(double t) {
  final u = t.clamp(0.0, 1.0);
  final y = _lerp(LevelMapData.roadBottomY, LevelMapData.roadTopY, u);
  final x = _lerp(LevelMapData.roadBottomX, LevelMapData.roadTopX, u) +
      210 * math.sin(u * 8 * math.pi) +
      40 * math.sin(u * 2 * math.pi);
  return Offset(x.clamp(160.0, 840.0), y);
}

List<Offset> sampleQuestTrail(int count) {
  if (count <= 0) return const [];
  if (count == 1) return [roadPoint(0)];
  return [
    for (var i = 0; i < count; i++) roadPoint(i / (count - 1)),
  ];
}

bool isCheckpointLevel(int id) =>
    id == LevelMapData.levelCount ||
    (id > 0 && (id - 1) % LevelMapData.checkpointEvery == 0);

List<QuestMapPin> buildQuestMapPins(List<LevelProgress> progress) {
  final byId = {for (final row in progress) row.id: row};
  final spots = sampleQuestTrail(LevelMapData.levelCount);
  return [
    for (var i = 0; i < spots.length; i++)
      QuestMapPin(
        id: i + 1,
        x: spots[i].dx,
        y: spots[i].dy,
        status: byId[i + 1]?.status ?? LevelStatus.locked,
        stars: byId[i + 1]?.stars ?? 0,
        checkpoint: isCheckpointLevel(i + 1),
      ),
  ];
}
