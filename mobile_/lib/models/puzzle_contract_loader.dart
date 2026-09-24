import 'dart:convert';

import 'package:flutter/services.dart';

import 'puzzle.dart';
import 'puzzle_contract.dart';

/// Loads TBA canonical puzzle envelopes from assets or raw JSON.
class PuzzleContractLoader {
  const PuzzleContractLoader();

  Future<PuzzleLoadResult> loadAsset(String assetPath) async {
    try {
      final raw = await rootBundle.loadString(assetPath);
      return loadJsonString(raw);
    } catch (_) {
      return const PuzzleRejected(
        message: 'Could not load puzzle file.',
        code: PuzzleRejectCode.invalidShape,
      );
    }
  }

  PuzzleLoadResult loadJsonString(String raw) {
    try {
      final decoded = jsonDecode(raw);
      return PuzzleEnvelope.parse(decoded);
    } catch (_) {
      return const PuzzleRejected(
        message: 'Puzzle file is not valid JSON.',
        code: PuzzleRejectCode.invalidShape,
      );
    }
  }

  PuzzleLoadResult loadJson(Object? decoded) => PuzzleEnvelope.parse(decoded);

  /// Returns a playable [PuzzleEpisode] when the envelope is a valid crossword.
  PuzzleEpisode? episodeOrNull(PuzzleLoadResult result) {
    if (result is! PuzzleLoaded) return null;
    final data = result.envelope.data;
    if (data is! CrosswordData) return null;
    return crosswordToEpisode(result.envelope, data);
  }
}
