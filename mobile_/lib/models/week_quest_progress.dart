class WeekSessionMark {
  const WeekSessionMark({required this.label, required this.done});

  final String label;
  final bool done;
}

/// One week is its videos (usually 3), then 1 quiz and 1 puzzle.
class WeekQuestProgress {
  static const int defaultVideoCount = 3;

  const WeekQuestProgress({
    required this.videosDone,
    required this.quizDone,
    required this.puzzleDone,
    this.videoCount = defaultVideoCount,
    this.watchedIndexes,
  });

  final int videosDone;
  final bool quizDone;
  final bool puzzleDone;
  final int videoCount;

  /// Watched lesson indexes. When set, a later video can count before an earlier one.
  final Set<int>? watchedIndexes;

  int get totalSessions => videoCount + 2;

  int get videosCompleted {
    final indexes = watchedIndexes;
    if (indexes == null) return videosDone.clamp(0, videoCount);
    var count = 0;
    for (var i = 0; i < videoCount; i++) {
      if (indexes.contains(i)) count += 1;
    }
    return count;
  }

  bool watchedAt(int index) {
    final indexes = watchedIndexes;
    if (indexes != null) return indexes.contains(index);
    return index >= 0 && index < videosCompleted;
  }

  bool get videosFinished {
    if (videoCount == 0) return true;
    if (watchedIndexes != null) return videosCompleted >= videoCount;
    return videosDone.clamp(0, videoCount) >= videoCount;
  }

  int get completed =>
      videosCompleted + (quizDone ? 1 : 0) + (puzzleDone ? 1 : 0);

  double get fraction => completed / totalSessions;

  /// First lesson not yet watched, or null when every lesson is done.
  int? get nextVideoIndex {
    if (videosFinished) return null;
    if (watchedIndexes != null) {
      for (var i = 0; i < videoCount; i++) {
        if (!watchedIndexes!.contains(i)) return i;
      }
      return null;
    }
    return videosCompleted;
  }

  bool get isCaughtUp => videosFinished && quizDone && puzzleDone;

  List<WeekSessionMark> get marks => [
        for (var i = 0; i < videoCount; i++)
          WeekSessionMark(label: 'V${i + 1}', done: watchedAt(i)),
        WeekSessionMark(label: 'Quiz', done: quizDone),
        WeekSessionMark(label: 'Puz', done: puzzleDone),
      ];
}
