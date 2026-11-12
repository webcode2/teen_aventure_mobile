/// A quiz result shown out of 10, whatever the quiz length (15 of 30 → 5/10).
enum QuizBand { keepGoing, average, good, excellent, perfect }

class QuizRating {
  QuizRating(this.correct, this.total);

  final int correct;
  final int total;

  /// Exact share of correct answers; the band uses this, never the rounded score.
  double get fraction => total <= 0 ? 0 : (correct.clamp(0, total)) / total;

  /// Score out of 10, rounded to one decimal place.
  double get outOfTen => (fraction * 100).round() / 10;

  /// "5/10", "7.5/10", "10/10" — a decimal only when needed.
  String get label {
    final score = outOfTen;
    final text = score == score.roundToDouble() ? score.toInt().toString() : score.toStringAsFixed(1);
    return '$text/10';
  }

  QuizBand get band {
    if (total > 0 && correct >= total) return QuizBand.perfect;
    final percent = fraction * 100;
    if (percent >= 90) return QuizBand.excellent;
    if (percent >= 70) return QuizBand.good;
    if (percent >= 50) return QuizBand.average;
    return QuizBand.keepGoing;
  }

  String get message => switch (band) {
        QuizBand.keepGoing =>
          "Don't give up! Every question teaches you something new. Rewatch the videos and try again.",
        QuizBand.average =>
          "Good effort! You're getting there. A little more time in the Word will make a big difference.",
        QuizBand.good => 'Well done! You know this well, and you can do even better next time.',
        QuizBand.excellent => "Excellent work! You're so close to perfect. Keep growing in the Word!",
        QuizBand.perfect => 'Perfect score! Amazing work. Keep it up and stay faithful in the Word!',
      };
}
