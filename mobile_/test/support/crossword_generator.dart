import 'dart:math';
import '../../lib/models/puzzle.dart';
import '../../lib/models/episode.dart';

class PlacedWord {
  final int number;
  final Direction direction;
  final int row;
  final int col;
  final String answer;
  final String clue;
  final String ref;
  final String verseText;

  PlacedWord({
    required this.number,
    required this.direction,
    required this.row,
    required this.col,
    required this.answer,
    required this.clue,
    required this.ref,
    this.verseText = '',
  });
}

class GeneratedPuzzle {
  final int rows;
  final int cols;
  final List<PlacedWord> words;
  final List<String> unplaced;
  final int crosses;

  GeneratedPuzzle({
    required this.rows,
    required this.cols,
    required this.words,
    required this.unplaced,
    required this.crosses,
  });
}

class CrosswordGenerator {
  static GeneratedPuzzle generate(List<WordInput> inputs, {required int seed}) {
    if (inputs.isEmpty) {
      return GeneratedPuzzle(
        rows: 0,
        cols: 0,
        words: const [],
        unplaced: const [],
        crosses: 0,
      );
    }

    final rand = Random(seed);
    // Shuffle inputs and sort by length descending
    final wordsToPlace = List<WordInput>.from(inputs)..shuffle(rand);
    wordsToPlace.sort((a, b) => b.answer.length.compareTo(a.answer.length));

    const maxDim = 40;
    const center = 20;
    final grid = List.generate(maxDim, (_) => List.filled(maxDim, ''));

    final placedList = <_InternalPlaced>[];
    final remaining = List<WordInput>.from(wordsToPlace);

    // Place 1st anchor word in the center
    final first = remaining.removeAt(0);
    final firstDir = rand.nextBool() ? Direction.across : Direction.down;
    final firstRow = firstDir == Direction.across
        ? center
        : center - (first.answer.length ~/ 2);
    final firstCol = firstDir == Direction.across
        ? center - (first.answer.length ~/ 2)
        : center;

    if (_canPlace(grid, first.answer, firstRow, firstCol, firstDir)) {
      _place(grid, first.answer, firstRow, firstCol, firstDir);
      placedList.add(_InternalPlaced(first, firstRow, firstCol, firstDir));
    } else {
      _place(grid, first.answer, center, center - (first.answer.length ~/ 2),
          Direction.across);
      placedList.add(_InternalPlaced(first, center,
          center - (first.answer.length ~/ 2), Direction.across));
    }

    // Iterative multi-pass placement until no more words can be connected
    bool progress = true;
    while (progress && remaining.isNotEmpty) {
      progress = false;
      for (int i = 0; i < remaining.length; i++) {
        final input = remaining[i];
        final placement = _findBestPlacement(grid, input, rand);
        if (placement != null) {
          _place(
              grid, input.answer, placement.row, placement.col, placement.dir);
          placedList.add(_InternalPlaced(
              input, placement.row, placement.col, placement.dir));
          remaining.removeAt(i);
          progress = true;
          break;
        }
      }
    }

    final unplaced = remaining.map((w) => w.answer).toList();

    if (placedList.isEmpty) {
      return GeneratedPuzzle(
        rows: 0,
        cols: 0,
        words: const [],
        unplaced: unplaced,
        crosses: 0,
      );
    }

    // Determine bounding box
    int minR = maxDim, maxR = 0, minC = maxDim, maxC = 0;
    for (final p in placedList) {
      final len = p.input.answer.length;
      final endR = p.dir == Direction.down ? p.row + len - 1 : p.row;
      final endC = p.dir == Direction.across ? p.col + len - 1 : p.col;

      if (p.row < minR) minR = p.row;
      if (endR > maxR) maxR = endR;
      if (p.col < minC) minC = p.col;
      if (endC > maxC) maxC = endC;
    }

    final rowOffset = minR;
    final colOffset = minC;
    final gridRows = maxR - minR + 1;
    final gridCols = maxC - minC + 1;

    // Group starting positions to assign clue numbers in order (top-to-bottom, left-to-right)
    final startPositions = <String, int>{};
    final sortedPlaced = List<_InternalPlaced>.from(placedList)
      ..sort((a, b) {
        final rA = a.row - rowOffset;
        final rB = b.row - rowOffset;
        if (rA != rB) return rA.compareTo(rB);
        return (a.col - colOffset).compareTo(b.col - colOffset);
      });

    int currentNum = 1;
    for (final p in sortedPlaced) {
      final key = '${p.row - rowOffset},${p.col - colOffset}';
      if (!startPositions.containsKey(key)) {
        startPositions[key] = currentNum++;
      }
    }

    final resultWords = <PlacedWord>[];
    for (final p in sortedPlaced) {
      final r = p.row - rowOffset;
      final c = p.col - colOffset;
      final num = startPositions['$r,$c']!;
      resultWords.add(PlacedWord(
        number: num,
        direction: p.dir,
        row: r,
        col: c,
        answer: p.input.answer.toUpperCase(),
        clue: p.input.clue,
        ref: p.input.ref,
        verseText: p.input.verseText,
      ));
    }

    return GeneratedPuzzle(
      rows: gridRows,
      cols: gridCols,
      words: resultWords,
      unplaced: unplaced,
      crosses: placedList.length - unplaced.length,
    );
  }

  static _Placement? _findBestPlacement(
      List<List<String>> grid, WordInput input, Random rand) {
    final word = input.answer.toUpperCase();
    final len = word.length;
    final candidates = <_Placement>[];

    for (int r = 1; r < 38; r++) {
      for (int c = 1; c < 38; c++) {
        final char = grid[r][c];
        if (char.isEmpty) continue;

        for (int i = 0; i < len; i++) {
          if (word[i] == char) {
            // Try across
            final startColAcross = c - i;
            if (_canPlace(grid, word, r, startColAcross, Direction.across)) {
              final score =
                  _score(grid, word, r, startColAcross, Direction.across);
              candidates
                  .add(_Placement(r, startColAcross, Direction.across, score));
            }
            // Try down
            final startRowDown = r - i;
            if (_canPlace(grid, word, startRowDown, c, Direction.down)) {
              final score = _score(grid, word, startRowDown, c, Direction.down);
              candidates
                  .add(_Placement(startRowDown, c, Direction.down, score));
            }
          }
        }
      }
    }

    if (candidates.isEmpty) return null;
    candidates.sort((a, b) => b.score.compareTo(a.score));
    final topScore = candidates.first.score;
    final topCandidates = candidates.where((c) => c.score == topScore).toList();
    return topCandidates[rand.nextInt(topCandidates.length)];
  }

  static bool _canPlace(List<List<String>> grid, String word, int startR,
      int startC, Direction dir) {
    final len = word.length;
    if (startR < 1 || startC < 1) return false;

    if (dir == Direction.across) {
      if (startC + len >= 39) return false;
      // Before and after word buffer
      if (grid[startR][startC - 1].isNotEmpty ||
          grid[startR][startC + len].isNotEmpty) return false;

      for (int i = 0; i < len; i++) {
        final r = startR;
        final c = startC + i;
        final char = grid[r][c];
        final target = word[i].toUpperCase();

        if (char.isNotEmpty) {
          if (char != target) return false;
        } else {
          // Empty cell: top and bottom neighbors MUST be empty to avoid accidental vertical touches
          if (grid[r - 1][c].isNotEmpty || grid[r + 1][c].isNotEmpty)
            return false;
        }
      }
    } else {
      if (startR + len >= 39) return false;
      // Before and after word buffer
      if (grid[startR - 1][startC].isNotEmpty ||
          grid[startR + len][startC].isNotEmpty) return false;

      for (int i = 0; i < len; i++) {
        final r = startR + i;
        final c = startC;
        final char = grid[r][c];
        final target = word[i].toUpperCase();

        if (char.isNotEmpty) {
          if (char != target) return false;
        } else {
          // Empty cell: left and right neighbors MUST be empty to avoid accidental horizontal touches
          if (grid[r][c - 1].isNotEmpty || grid[r][c + 1].isNotEmpty)
            return false;
        }
      }
    }

    return true;
  }

  static int _score(List<List<String>> grid, String word, int startR,
      int startC, Direction dir) {
    int crosses = 0;
    for (int i = 0; i < word.length; i++) {
      final r = dir == Direction.down ? startR + i : startR;
      final c = dir == Direction.across ? startC + i : startC;
      if (grid[r][c].isNotEmpty) crosses++;
    }
    return crosses;
  }

  static void _place(List<List<String>> grid, String word, int startR,
      int startC, Direction dir) {
    final w = word.toUpperCase();
    for (int i = 0; i < w.length; i++) {
      final r = dir == Direction.down ? startR + i : startR;
      final c = dir == Direction.across ? startC + i : startC;
      grid[r][c] = w[i];
    }
  }
}

class _InternalPlaced {
  final WordInput input;
  final int row;
  final int col;
  final Direction dir;

  _InternalPlaced(this.input, this.row, this.col, this.dir);
}

class _Placement {
  final int row;
  final int col;
  final Direction dir;
  final int score;

  _Placement(this.row, this.col, this.dir, this.score);
}
