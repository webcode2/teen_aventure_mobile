import 'dart:math' as math;
import 'dart:ui' show Offset;

import 'package:flutter/foundation.dart';

import 'puzzle_contract.dart';
import 'puzzle_contract_loader.dart';
import '../services/content_service.dart';
import '../services/service_locator.dart';

enum MatchingScreenState { loading, ready, rejected }

/// Playable match-pairs session: draw lines from left words to shuffled right words.
class MatchingController extends ChangeNotifier {
  MatchingController({PuzzleContractLoader? contractLoader})
      : _contractLoader = contractLoader ?? const PuzzleContractLoader();

  final PuzzleContractLoader _contractLoader;

  MatchingScreenState screenState = MatchingScreenState.loading;
  String? statusMessage;

  String title = '';
  String scripture = '';
  String prompt = '';
  String ref = '';
  String? versionId;
  String? boundMatchingId;

  List<String> leftColumn = const [];
  /// Display order of the right column (shuffled).
  List<String> rightDisplay = const [];
  /// Maps display index → original rightColumn index.
  List<int> rightSourceIndex = const [];

  /// Correct answer map: left index → original right index.
  Map<int, int> _answerByLeft = const {};

  /// Locked correct pairs: left → display-right index.
  final Map<int, int> locked = {};

  /// Latest attempt (may be wrong): left → display-right index.
  final Map<int, int> attempts = {};

  /// Left indexes whose last attempt was wrong (flash until cleared).
  final Set<int> wrongFlash = {};

  int? selectedLeft;
  int? dragFromLeft;
  Offset? dragPointer;

  DateTime? _startedAt;
  Duration? _elapsedAtComplete;
  bool completed = false;

  Duration get elapsed {
    if (_elapsedAtComplete != null) return _elapsedAtComplete!;
    final started = _startedAt;
    if (started == null) return Duration.zero;
    return DateTime.now().difference(started);
  }

  int get totalPairs => leftColumn.length;
  int get solvedCount => locked.length;
  bool get isComplete => completed || (totalPairs > 0 && locked.length == totalPairs);

  /// Parse a MATCHING envelope doc (used by live load and tests).
  bool loadFromDoc(Object? doc, {String? versionId, String? titleOverride}) {
    completed = false;
    locked.clear();
    attempts.clear();
    wrongFlash.clear();
    selectedLeft = null;
    dragFromLeft = null;
    dragPointer = null;
    this.versionId = versionId;

    final result = _contractLoader.loadJson(doc);
    if (result is! PuzzleLoaded || result.envelope.data is! MatchingData) {
      _reject('This match game could not be opened.');
      return false;
    }
    final envelope = result.envelope;
    final data = envelope.data as MatchingData;
    _install(envelope, data);
    if (titleOverride != null && titleOverride.trim().isNotEmpty) {
      title = titleOverride.trim();
    }
    screenState = MatchingScreenState.ready;
    statusMessage = null;
    _startedAt = DateTime.now();
    _elapsedAtComplete = null;
    notifyListeners();
    return true;
  }

  Future<void> loadLive({
    required String matchingId,
    ContentService? contentService,
  }) async {
    final id = matchingId.trim();
    boundMatchingId = id.isEmpty ? null : id;
    screenState = MatchingScreenState.loading;
    statusMessage = null;
    versionId = null;
    completed = false;
    locked.clear();
    attempts.clear();
    wrongFlash.clear();
    selectedLeft = null;
    dragFromLeft = null;
    dragPointer = null;
    notifyListeners();

    if (id.isEmpty) {
      _reject('This week has no match game attached.');
      return;
    }

    try {
      final service = contentService ?? ServiceLocator.instance.contentService;
      final live = await service.getLiveMatching(matchingId: id);
      if (live == null) {
        _reject('Could not load this match game. Please try again later.');
        return;
      }
      loadFromDoc(live.doc, versionId: live.versionId, titleOverride: live.title);
    } catch (_) {
      _reject('Could not load this match game. Please try again later.');
    }
  }

  void _reject(String message) {
    screenState = MatchingScreenState.rejected;
    statusMessage = message;
    notifyListeners();
  }

  void _install(PuzzleEnvelope envelope, MatchingData data) {
    title = envelope.title;
    scripture = envelope.scripture;
    prompt = data.prompt;
    ref = data.ref;
    leftColumn = List<String>.from(data.leftColumn);

    final n = data.rightColumn.length;
    final order = List<int>.generate(n, (i) => i);
    order.shuffle(math.Random(envelope.id.hashCode ^ data.prompt.hashCode));
    // Avoid the trivial identity order when possible.
    if (n > 1 && listEquals(order, List<int>.generate(n, (i) => i))) {
      order.shuffle();
    }
    rightSourceIndex = order;
    rightDisplay = [for (final i in order) data.rightColumn[i]];

    _answerByLeft = {
      for (final pair in data.correctPairs) pair.left: pair.right,
    };
  }

  void selectLeft(int left) {
    if (isComplete || locked.containsKey(left)) return;
    selectedLeft = left;
    wrongFlash.remove(left);
    notifyListeners();
  }

  void beginDrag(int left, Offset globalPointer) {
    if (isComplete || locked.containsKey(left)) return;
    dragFromLeft = left;
    selectedLeft = left;
    dragPointer = globalPointer;
    wrongFlash.remove(left);
    notifyListeners();
  }

  void updateDrag(Offset globalPointer) {
    if (dragFromLeft == null) return;
    dragPointer = globalPointer;
    notifyListeners();
  }

  void cancelDrag() {
    dragFromLeft = null;
    dragPointer = null;
    notifyListeners();
  }

  /// Connect [left] to the right chip at [displayRight].
  void connect(int left, int displayRight) {
    if (isComplete || locked.containsKey(left)) return;
    if (displayRight < 0 || displayRight >= rightDisplay.length) return;

    // Right chip already locked to another left.
    if (locked.values.contains(displayRight)) return;

    final sourceRight = rightSourceIndex[displayRight];
    final expected = _answerByLeft[left];
    attempts[left] = displayRight;
    dragFromLeft = null;
    dragPointer = null;
    selectedLeft = null;

    if (expected == sourceRight) {
      locked[left] = displayRight;
      wrongFlash.remove(left);
      attempts.remove(left);
      if (locked.length == totalPairs) {
        completed = true;
        _elapsedAtComplete = elapsed;
      }
    } else {
      wrongFlash.add(left);
    }
    notifyListeners();
  }

  void tapRight(int displayRight) {
    final left = selectedLeft ?? dragFromLeft;
    if (left == null) return;
    connect(left, displayRight);
  }

  void clearWrong(int left) {
    if (locked.containsKey(left)) return;
    attempts.remove(left);
    wrongFlash.remove(left);
    if (selectedLeft == left) selectedLeft = null;
    notifyListeners();
  }

  void clearAllAttempts() {
    if (isComplete) return;
    attempts.clear();
    wrongFlash.clear();
    selectedLeft = null;
    dragFromLeft = null;
    dragPointer = null;
    notifyListeners();
  }
}
