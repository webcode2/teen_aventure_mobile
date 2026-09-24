import 'dart:math';
import 'puzzle.dart';
import 'episode.dart';
import 'crossword_generator.dart';

class PuzzleEngine {
  static PuzzleEpisode build(Episode ep, int seed) {
    var g = CrosswordGenerator.generate(ep.words, seed: seed);
    // Paranoia: if a rare seed strands a word, nudge until clean (still deterministic)
    for (var i = 0; g.unplaced.isNotEmpty && i < 5; i++) {
      g = CrosswordGenerator.generate(ep.words, seed: seed + i + 1);
    }

    final calculatedSize = max(g.rows, g.cols);

    return PuzzleEpisode(
      id: ep.id,
      episodeNumber: ep.episodeNumber,
      title: ep.title,
      theme: ep.subtitle,
      gridSize: max(12, calculatedSize),
      words: [
        for (final w in g.words)
          PWord(
            number: w.number,
            direction: w.direction,
            startRow: w.row,
            startCol: w.col,
            answer: w.answer,
            clue: w.clue,
            ref: w.ref,
            verseText: w.verseText,
          ),
      ],
    );
  }
}
