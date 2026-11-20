Duration? remainingGameTime(int? limitSeconds, Duration elapsed) {
  if (limitSeconds == null) return null;
  final remaining = Duration(seconds: limitSeconds) - elapsed;
  final microseconds = remaining.inMicroseconds;
  if (microseconds <= 0) return Duration.zero;
  // Round up so the display reaches zero only when the attempt actually ends.
  return Duration(seconds: (microseconds + Duration.microsecondsPerSecond - 1) ~/
      Duration.microsecondsPerSecond);
}


class GameRoundScore {
  const GameRoundScore({
    required this.correct,
    required this.answers,
    required this.maxPoints,
  });

  final int correct;
  final List<Object?> answers;
  final int? maxPoints;

  int get total => answers.length;
  int get percent => total == 0 ? 0 : (100 * correct / total).round();
  int? get points {
    final maximum = maxPoints;
    return maximum == null || total == 0 ? null : (maximum * correct / total).round();
  }
  bool get allAttempted => total > 0 && answers.every((answer) => answer != null);
  bool get passed => allAttempted && correct * 2 > total;
}
