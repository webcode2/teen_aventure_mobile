import 'dart:math' as math;

import 'puzzle.dart';

/// Highest envelope schemaVersion this app build understands.
const int kSupportedPuzzleSchemaVersion = 1;

/// Default bundled golden played by the existing puzzle screen.
const String kDefaultCanonicalAsset = 'assets/puzzles/jael.canonical.json';

/// Sealed puzzle payload under envelope `data`.
sealed class PuzzleData {
  const PuzzleData();
}

final class CrosswordData extends PuzzleData {
  const CrosswordData({
    required this.rows,
    required this.cols,
    required this.entries,
  });

  final int rows;
  final int cols;
  final List<CrosswordEntry> entries;
}

final class MatchingData extends PuzzleData {
  const MatchingData({
    required this.prompt,
    required this.ref,
    required this.leftColumn,
    required this.rightColumn,
    required this.correctPairs,
  });

  final String prompt;
  final String ref;
  final List<String> leftColumn;
  final List<String> rightColumn;
  final List<({int left, int right})> correctPairs;
}

/// Unknown `type` or schemaVersion beyond what this build supports.
final class UnsupportedPuzzle extends PuzzleData {
  const UnsupportedPuzzle({
    required this.rawType,
    required this.schemaVersion,
    this.reason = 'update_required',
  });

  final String rawType;
  final int schemaVersion;
  final String reason;
}

final class CrosswordEntry {
  const CrosswordEntry({
    required this.id,
    required this.number,
    required this.direction,
    required this.row,
    required this.col,
    required this.answer,
    required this.clue,
    required this.ref,
  });

  final String id;
  final int number;
  final Direction direction;
  final int row;
  final int col;
  final String answer;
  final String clue;
  final String ref;
}

/// Top-level TBA puzzle envelope (contracts source of truth).
final class PuzzleEnvelope {
  const PuzzleEnvelope({
    required this.schemaVersion,
    required this.id,
    required this.type,
    required this.title,
    required this.scripture,
    required this.rewards,
    required this.data,
  });

  final int schemaVersion;
  final String id;
  final String type;
  final String title;
  final String scripture;
  final Map<String, dynamic> rewards;
  final PuzzleData data;

  /// Factory on `type` (+ schemaVersion gate). Never throws.
  static PuzzleLoadResult parse(Object? raw) {
    if (raw is! Map) {
      return const PuzzleRejected(
        message: 'Puzzle file is not a JSON object.',
        code: PuzzleRejectCode.invalidShape,
      );
    }
    final map = Map<String, dynamic>.from(raw);

    final schemaVersion = _asInt(map['schemaVersion']) ?? 0;
    final type = (map['type'] as String?)?.trim() ?? '';
    final id = (map['id'] as String?)?.trim() ?? '';
    final title = (map['title'] as String?)?.trim() ?? '';
    final scripture = (map['scripture'] as String?)?.trim() ?? '';
    final rewards = map['rewards'] is Map
        ? Map<String, dynamic>.from(map['rewards'] as Map)
        : <String, dynamic>{};

    if (schemaVersion > kSupportedPuzzleSchemaVersion || type.isEmpty) {
      return PuzzleLoaded(
        PuzzleEnvelope(
          schemaVersion: schemaVersion,
          id: id.isEmpty ? 'unknown' : id,
          type: type.isEmpty ? 'UNKNOWN' : type,
          title: title.isEmpty ? 'Puzzle' : title,
          scripture: scripture,
          rewards: rewards,
          data: UnsupportedPuzzle(
            rawType: type.isEmpty ? 'UNKNOWN' : type,
            schemaVersion: schemaVersion,
            reason: schemaVersion > kSupportedPuzzleSchemaVersion
                ? 'schema_too_new'
                : 'unknown_type',
          ),
        ),
      );
    }

    if (type != 'CROSSWORD' && type != 'MATCHING') {
      return PuzzleLoaded(
        PuzzleEnvelope(
          schemaVersion: schemaVersion,
          id: id.isEmpty ? 'unknown' : id,
          type: type,
          title: title.isEmpty ? 'Puzzle' : title,
          scripture: scripture,
          rewards: rewards,
          data: UnsupportedPuzzle(
            rawType: type,
            schemaVersion: schemaVersion,
            reason: 'unknown_type',
          ),
        ),
      );
    }

    final dataRaw = map['data'];
    if (dataRaw is! Map) {
      return const PuzzleRejected(
        message: 'Puzzle data is missing or invalid.',
        code: PuzzleRejectCode.invalidShape,
      );
    }
    final dataMap = Map<String, dynamic>.from(dataRaw);

    if (type == 'MATCHING') {
      final matching = _parseMatching(dataMap);
      if (matching == null) {
        return const PuzzleRejected(
          message: 'Matching puzzle data is incomplete.',
          code: PuzzleRejectCode.invalidShape,
        );
      }
      return PuzzleLoaded(
        PuzzleEnvelope(
          schemaVersion: schemaVersion,
          id: id,
          type: type,
          title: title,
          scripture: scripture,
          rewards: rewards,
          data: matching,
        ),
      );
    }

    final crossword = _parseCrossword(dataMap);
    if (crossword == null) {
      return const PuzzleRejected(
        message: 'Crossword puzzle data is incomplete.',
        code: PuzzleRejectCode.invalidShape,
      );
    }

    final guard = guardCrossword(crossword);
    if (guard != null) return guard;

    return PuzzleLoaded(
      PuzzleEnvelope(
        schemaVersion: schemaVersion,
        id: id,
        type: type,
        title: title,
        scripture: scripture,
        rewards: rewards,
        data: crossword,
      ),
    );
  }
}

enum PuzzleRejectCode { invalidShape, emptyEntries, bounds, collision }

/// Result of parsing / guarding a puzzle document. Never thrown as an exception.
sealed class PuzzleLoadResult {
  const PuzzleLoadResult();
}

final class PuzzleLoaded extends PuzzleLoadResult {
  const PuzzleLoaded(this.envelope);
  final PuzzleEnvelope envelope;
}

final class PuzzleRejected extends PuzzleLoadResult {
  const PuzzleRejected({required this.message, required this.code});
  final String message;
  final PuzzleRejectCode code;
}

CrosswordData? _parseCrossword(Map<String, dynamic> data) {
  final grid = data['grid'];
  if (grid is! Map) return null;
  final rows = _asInt(grid['rows']);
  final cols = _asInt(grid['cols']);
  final entriesRaw = data['entries'];
  if (rows == null || cols == null || entriesRaw is! List) return null;

  final entries = <CrosswordEntry>[];
  for (final item in entriesRaw) {
    if (item is! Map) return null;
    final m = Map<String, dynamic>.from(item);
    final dirRaw = (m['direction'] as String?)?.toLowerCase();
    final direction = dirRaw == 'across'
        ? Direction.across
        : dirRaw == 'down'
            ? Direction.down
            : null;
    final answer = (m['answer'] as String?)?.toUpperCase().replaceAll(RegExp(r'[^A-Z]'), '') ?? '';
    final id = (m['id'] as String?) ?? '';
    final number = _asInt(m['number']);
    final row = _asInt(m['row']);
    final col = _asInt(m['col']);
    final clue = (m['clue'] as String?) ?? '';
    final ref = (m['ref'] as String?) ?? '';
    if (direction == null ||
        answer.isEmpty ||
        id.isEmpty ||
        number == null ||
        row == null ||
        col == null) {
      return null;
    }
    entries.add(
      CrosswordEntry(
        id: id,
        number: number,
        direction: direction,
        row: row,
        col: col,
        answer: answer,
        clue: clue,
        ref: ref,
      ),
    );
  }

  return CrosswordData(rows: rows, cols: cols, entries: entries);
}

MatchingData? _parseMatching(Map<String, dynamic> data) {
  final prompt = data['prompt'] as String?;
  final ref = data['ref'] as String?;
  final left = data['leftColumn'];
  final right = data['rightColumn'];
  final pairs = data['correctPairs'];
  if (prompt == null ||
      ref == null ||
      left is! List ||
      right is! List ||
      pairs is! List) {
    return null;
  }
  final correctPairs = <({int left, int right})>[];
  for (final p in pairs) {
    if (p is! Map) return null;
    final l = _asInt(p['left']);
    final r = _asInt(p['right']);
    if (l == null || r == null) return null;
    correctPairs.add((left: l, right: r));
  }
  return MatchingData(
    prompt: prompt,
    ref: ref,
    leftColumn: left.map((e) => '$e').toList(),
    rightColumn: right.map((e) => '$e').toList(),
    correctPairs: correctPairs,
  );
}

/// Thin client guard: empty entries, bounds, letter collisions → reject (no throw).
PuzzleRejected? guardCrossword(CrosswordData data) {
  if (data.entries.isEmpty) {
    return const PuzzleRejected(
      message: 'This puzzle has no entries.',
      code: PuzzleRejectCode.emptyEntries,
    );
  }

  final occupied = <String, String>{};
  for (final entry in data.entries) {
    for (var i = 0; i < entry.answer.length; i++) {
      final r = entry.direction == Direction.down ? entry.row + i : entry.row;
      final c = entry.direction == Direction.across ? entry.col + i : entry.col;
      if (r < 0 || c < 0 || r >= data.rows || c >= data.cols) {
        return PuzzleRejected(
          message:
              'Entry ${entry.id} goes outside the ${data.rows}×${data.cols} grid.',
          code: PuzzleRejectCode.bounds,
        );
      }
      final key = '$r:$c';
      final letter = entry.answer[i];
      final prev = occupied[key];
      if (prev != null && prev != letter) {
        return PuzzleRejected(
          message:
              'Letter collision at ($r,$c): "$prev" vs "$letter" (${entry.id}).',
          code: PuzzleRejectCode.collision,
        );
      }
      occupied[key] = letter;
    }
  }
  return null;
}

/// Adapt a validated crossword envelope into the existing [PuzzleEpisode] gameplay model.
PuzzleEpisode crosswordToEpisode(PuzzleEnvelope envelope, CrosswordData data) {
  final size = math.max(data.rows, data.cols);
  return PuzzleEpisode(
    id: envelope.id,
    episodeNumber: 1,
    title: envelope.title,
    theme: envelope.scripture,
    gridSize: size,
    words: [
      for (final e in data.entries)
        PWord(
          number: e.number,
          direction: e.direction,
          answer: e.answer,
          clue: e.clue,
          ref: e.ref,
          startRow: e.row,
          startCol: e.col,
        ),
    ],
  );
}

int? _asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}
