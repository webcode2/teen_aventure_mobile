class WeekSessionMark {
  const WeekSessionMark({required this.label, required this.done});

  final String label;
  final bool done;
}

/// One week is 5 sessions: 3 videos, 1 quiz, 1 puzzle.
class WeekQuestProgress {
  static const int videoCount = 3;
  static const int totalSessions = 5;

  const WeekQuestProgress({
    required this.videosDone,
    required this.quizDone,
    required this.puzzleDone,
  });

  final int videosDone;
  final bool quizDone;
  final bool puzzleDone;

  int get videosCompleted => videosDone.clamp(0, videoCount);

  int get completed =>
      videosCompleted + (quizDone ? 1 : 0) + (puzzleDone ? 1 : 0);

  double get fraction => completed / totalSessions;

  /// Next video index (0-based), or null when all three are done.
  int? get nextVideoIndex =>
      videosCompleted < videoCount ? videosCompleted : null;

  bool get isCaughtUp =>
      videosCompleted >= videoCount && quizDone && puzzleDone;

  List<WeekSessionMark> get marks => [
        WeekSessionMark(label: 'V1', done: videosCompleted >= 1),
        WeekSessionMark(label: 'V2', done: videosCompleted >= 2),
        WeekSessionMark(label: 'V3', done: videosCompleted >= 3),
        WeekSessionMark(label: 'Quiz', done: quizDone),
        WeekSessionMark(label: 'Puz', done: puzzleDone),
      ];
}
