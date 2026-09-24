enum LevelStatus {
  locked,
  unlocked,
  current,
  completed,
}

class LevelNode {
  final int id;
  final double xPercent;
  final double y;
  final LevelStatus status;
  final int stars;
  final int season;


  const LevelNode({
    required this.id,
    required this.xPercent,
    required this.y,
    required this.status,
    required this.stars,
    required this.season,
  });
}

class QuestSeason {
  final int id;
  final String name;
  final String backgroundAsset;
  final double assetWidth;
  final double assetHeight;
  final int firstLevel;
  final int lastLevel;

  const QuestSeason({
    required this.id,
    required this.name,
    required this.backgroundAsset,
    required this.assetWidth,
    required this.assetHeight,
    required this.firstLevel,
    required this.lastLevel,
  });

  int get levelCount => lastLevel - firstLevel + 1;
}

class LevelProgress {
  final int id;
  final LevelStatus status;
  final int stars;

  const LevelProgress({
    required this.id,
    required this.status,
    required this.stars,
  });
}
