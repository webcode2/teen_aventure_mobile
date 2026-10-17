import 'dart:math' as math;
import 'dart:ui';

import '../models/level_node.dart';

/// Mock adventure-map data. Swap [mockLevelProgress] for API rows later.
class LevelMapData {
  static const currentLevelId = 27;
  static const levelCount = 52;
  static const checkpointEvery = 6;
  static const mapWidth = 1000.0;
  static const mapHeight = 24000.0;
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
  return levelProgressForHighest(
    highestLevelId: currentLevelId,
    totalLevels: LevelMapData.levelCount,
  );
}

/// Map pins from the explorer's highest/current progress (not a browsed week).
/// Past levels stay completed so revisiting never lowers the shown high-water mark.
/// Future weeks are [LevelStatus.unlocked] — playable, but points only count in order.
List<LevelProgress> levelProgressForHighest({
  required int highestLevelId,
  int totalLevels = LevelMapData.levelCount,
  bool caughtUp = false,
}) {
  final currentId = caughtUp
      ? totalLevels.clamp(1, LevelMapData.levelCount)
      : highestLevelId.clamp(1, LevelMapData.levelCount);
  return [
    for (var id = 1; id <= LevelMapData.levelCount; id++)
      LevelProgress(
        id: id,
        status: id > totalLevels
            ? LevelStatus.locked
            : id < currentId
                ? LevelStatus.completed
                : id == currentId
                    ? (caughtUp ? LevelStatus.completed : LevelStatus.current)
                    : LevelStatus.unlocked,
        stars: id < currentId || (caughtUp && id == currentId) ? 3 : 0,
      ),
  ];
}

/// Warning when opening a week ahead of the sequential scoring path. Null = no alert.
String? jumpAheadPointsNotice({
  required int tappedWeek,
  required int sequentialWeek,
  required bool caughtUp,
  bool currentWeekComplete = false,
}) {
  if (caughtUp || tappedWeek <= sequentialWeek) return null;
  if (!currentWeekComplete) {
    return 'You are still on Quest $sequentialWeek. '
        'Finish its activities first if you want points.\n\n'
        'You can open Quest $tappedWeek, but jumping or skipping the order '
        'earns no points when you complete those activities.';
  }
  return 'For points, continue with Quest $sequentialWeek next.\n\n'
      'You can open Quest $tappedWeek, but jumping or skipping the order '
      'earns no points when you complete those activities.';
}

/// Level spots from the sea (level 1) up to the house (last level): always
/// climbing, drifting left and right at random. Keep in sync with
/// `LEVEL_PTS` in `assets/maps/quest_map.html`.
const levelSpots = <Offset>[
  Offset(500, 23480),
  Offset(760, 23039),
  Offset(602, 22506),
  Offset(816, 22121),
  Offset(715, 21655),
  Offset(541, 21307),
  Offset(658, 20738),
  Offset(508, 20296),
  Offset(317, 19972),
  Offset(488, 19396),
  Offset(784, 19016),
  Offset(490, 18515),
  Offset(261, 18191),
  Offset(524, 17686),
  Offset(270, 17168),
  Offset(372, 16755),
  Offset(689, 16372),
  Offset(470, 15908),
  Offset(384, 15402),
  Offset(178, 14961),
  Offset(338, 14506),
  Offset(507, 14138),
  Offset(420, 13647),
  Offset(680, 13123),
  Offset(486, 12733),
  Offset(335, 12249),
  Offset(456, 11839),
  Offset(623, 11427),
  Offset(371, 11028),
  Offset(445, 10592),
  Offset(635, 10007),
  Offset(535, 9541),
  Offset(692, 9133),
  Offset(514, 8737),
  Offset(628, 8288),
  Offset(713, 7847),
  Offset(394, 7319),
  Offset(529, 6991),
  Offset(396, 6464),
  Offset(321, 6071),
  Offset(222, 5564),
  Offset(353, 5136),
  Offset(224, 4773),
  Offset(330, 4249),
  Offset(619, 3818),
  Offset(412, 3396),
  Offset(612, 2877),
  Offset(808, 2419),
  Offset(615, 2099),
  Offset(727, 1533),
  Offset(636, 1159),
  Offset(340, 680),
];

/// t = 0 at the sea, t = 1 at the house, following [levelSpots].
Offset roadPoint(double t) {
  final f = t.clamp(0.0, 1.0) * (levelSpots.length - 1);
  final i = math.min(levelSpots.length - 2, f.floor());
  return Offset.lerp(levelSpots[i], levelSpots[i + 1], f - i)!;
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
