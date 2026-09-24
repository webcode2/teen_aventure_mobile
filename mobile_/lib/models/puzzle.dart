enum Direction { across, down }

class PWord {
  final int number;
  final Direction direction;
  final String answer;
  final String clue;
  final String ref;
  final String verseText;
  final int startRow;
  final int startCol;
  bool isSolved;

  PWord({
    required this.number,
    required this.direction,
    required this.answer,
    required this.clue,
    required this.ref,
    this.verseText = '',
    required this.startRow,
    required this.startCol,
    this.isSolved = false,
  });

  String get id => '${number}_${direction == Direction.across ? "A" : "D"}';
}

class Cell {
  final int row;
  final int col;
  final String targetLetter; // Empty string if black cell
  String userLetter;
  final int? clueNumber; // Number displayed in top-left of cell
  final List<String> wordIds; // IDs of words passing through this cell
  bool isSolved;

  Cell({
    required this.row,
    required this.col,
    required this.targetLetter,
    this.userLetter = '',
    this.clueNumber,
    required this.wordIds,
    this.isSolved = false,
  });

  bool get isLetterCell => targetLetter.isNotEmpty;
}

class PuzzleEpisode {
  final String id;
  final int episodeNumber;
  final String title;
  final String theme;
  final int gridSize;
  final List<PWord> words;

  PuzzleEpisode({
    required this.id,
    required this.episodeNumber,
    required this.title,
    required this.theme,
    this.gridSize = 12,
    required this.words,
  });
}

class QuizQuestion {
  final String id;
  final String question;
  final List<String> options;
  final int answerIndex;
  final int points;
  final String? explanation;
  final String? verseReference;

  const QuizQuestion({
    required this.id,
    required this.question,
    required this.options,
    required this.answerIndex,
    this.points = 5,
    this.explanation,
    this.verseReference,
  });
}
