import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'puzzle.dart';
import 'progress_store.dart';
import 'puzzle_contract.dart';
import 'puzzle_contract_loader.dart';
import '../data/quest_points.dart';
import 'week_quest_progress.dart';
import '../services/content_service.dart';
import '../services/service_locator.dart';

enum UserRole { student, parent, teacher }

/// How the puzzle screen should present load outcome (never via thrown errors).
enum PuzzleScreenState { loading, ready, rejected, unsupported }

/// Shown when the live puzzle is missing or cannot be built for play.
const String kPuzzleTechnicalIssueMessage =
    'A technical issue was encountered while loading this puzzle. Please try again later.';

class GameController extends ChangeNotifier {
  late PuzzleEpisode episode;
  late List<List<Cell>> grid;

  PuzzleScreenState puzzleScreenState = PuzzleScreenState.loading;
  String? puzzleStatusMessage;
  UnsupportedPuzzle? unsupportedPuzzle;
  
  PWord? activeWord;
  int cursorRow = 0;
  int cursorCol = 0;
  int gems = 4;
  int score = 0;
  int streakDays = 0;

  UserRole currentRole = UserRole.student;
  final Set<int> _watchedVideoParts = <int>{};

  /// Longest finished prefix: index 0, then 1, then 2.
  int get completedVideoParts {
    var prefix = 0;
    while (_watchedVideoParts.contains(prefix)) {
      prefix += 1;
    }
    return prefix;
  }
  bool weekQuizDone = false;
  bool weekPuzzleDone = false;

  String? activePuzzleVersionId;
  String? activePuzzleTitle;
  /// Studio puzzle id currently bound for the active week (stable across attempts).
  String? boundPuzzleId;
  bool isLoadedFromDb = false;

  PWord? newlySolvedWord;
  bool _scoringEnabled = true;
  final PuzzleContractLoader _contractLoader;

  DateTime? _puzzleStartedAt;
  Duration? _puzzleElapsedAtComplete;

  /// Wall-clock time since the puzzle screen was opened (frozen when finished).
  /// Preloading on Home does not start the clock.
  Duration get puzzleElapsed {
    if (_puzzleElapsedAtComplete != null) return _puzzleElapsedAtComplete!;
    final started = _puzzleStartedAt;
    if (started == null) return Duration.zero;
    return DateTime.now().difference(started);
  }

  /// Starts the stopwatch the first time the player opens [PuzzleScreen].
  void beginPuzzleTimer() {
    if (_puzzleElapsedAtComplete != null || _puzzleStartedAt != null) return;
    _puzzleStartedAt = DateTime.now();
    notifyListeners();
  }

  static String formatPuzzleElapsed(Duration d) {
    final total = d.inSeconds.clamp(0, 99 * 3600);
    final h = total ~/ 3600;
    final m = (total % 3600) ~/ 60;
    final s = total % 60;
    if (h > 0) {
      return '${h.toString().padLeft(2, '0')}:'
          '${m.toString().padLeft(2, '0')}:'
          '${s.toString().padLeft(2, '0')}';
    }
    return '${m.toString().padLeft(2, '0')}:'
        '${s.toString().padLeft(2, '0')}';
  }

  GameController({
    PuzzleEpisode? initialEpisode,
    PuzzleContractLoader? contractLoader,
  }) : _contractLoader = contractLoader ?? const PuzzleContractLoader() {
    if (initialEpisode != null) {
      loadEpisode(initialEpisode);
      puzzleScreenState = PuzzleScreenState.ready;
    } else {
      _installEmptyEpisode();
      puzzleScreenState = PuzzleScreenState.loading;
    }
  }

  void _installEmptyEpisode() {
    episode = PuzzleEpisode(
      id: '_pending',
      episodeNumber: 0,
      title: '',
      theme: '',
      gridSize: 1,
      words: const [],
    );
    grid = [
      [Cell(row: 0, col: 0, targetLetter: '', wordIds: const [])],
    ];
    activeWord = null;
  }

  /// Live puzzle from the backend only — no bundled Jael / sample fallback.
  /// Pass [puzzleId] for the week's attached Studio puzzle so reopen stays stable.
  Future<void> loadLiveFromDatabase({
    ContentService? contentService,
    String? puzzleId,
  }) async {
    final requestedId = puzzleId?.trim();
    puzzleScreenState = PuzzleScreenState.loading;
    puzzleStatusMessage = null;
    unsupportedPuzzle = null;
    isLoadedFromDb = false;
    activePuzzleVersionId = null;
    activePuzzleTitle = null;
    if (requestedId != null && requestedId.isNotEmpty) {
      boundPuzzleId = requestedId;
    }
    notifyListeners();

    try {
      final service = contentService ?? ServiceLocator.instance.contentService;
      final live = await service.getLivePuzzle(puzzleId: requestedId);
      if (live != null) {
        final result = _contractLoader.loadJson(live.doc);
        applyLoadResult(result);
        if (puzzleScreenState == PuzzleScreenState.ready) {
          activePuzzleVersionId = live.versionId;
          activePuzzleTitle = live.title;
          isLoadedFromDb = true;
          notifyListeners();
        }
        return;
      }
    } catch (_) {
      // Network/service failure → technical issue below.
    }

    markTechnicalIssue();
  }

  /// Same as [loadLiveFromDatabase] (name kept for existing call sites).
  Future<void> loadDefaultCanonical({
    ContentService? contentService,
    String? puzzleId,
  }) async {
    await loadLiveFromDatabase(contentService: contentService, puzzleId: puzzleId);
  }

  void markTechnicalIssue([String? message]) {
    puzzleScreenState = PuzzleScreenState.rejected;
    puzzleStatusMessage = message ?? kPuzzleTechnicalIssueMessage;
    unsupportedPuzzle = null;
    isLoadedFromDb = false;
    notifyListeners();
  }

  /// Apply a parse/guard result without throwing.
  void applyLoadResult(PuzzleLoadResult result) {
    switch (result) {
      case PuzzleRejected():
        markTechnicalIssue();
      case PuzzleLoaded(:final envelope):
        final data = envelope.data;
        switch (data) {
          case CrosswordData():
            try {
              loadEpisode(crosswordToEpisode(envelope, data));
              puzzleScreenState = PuzzleScreenState.ready;
              puzzleStatusMessage = null;
              unsupportedPuzzle = null;
              notifyListeners();
            } catch (_) {
              markTechnicalIssue();
            }
          case MatchingData():
            // Match games play on MatchingScreen, not the crossword controller.
            puzzleScreenState = PuzzleScreenState.unsupported;
            unsupportedPuzzle = UnsupportedPuzzle(
              rawType: 'MATCHING',
              schemaVersion: envelope.schemaVersion,
              reason: 'wrong_screen',
            );
            puzzleStatusMessage =
                'Open this week’s match game from the quest step.';
            notifyListeners();
          case UnsupportedPuzzle():
            puzzleScreenState = PuzzleScreenState.unsupported;
            unsupportedPuzzle = data;
            puzzleStatusMessage =
                'This puzzle needs a newer version of Teen Bible Adventures.';
            notifyListeners();
        }
    }
  }

  void switchRole(UserRole role) {
    currentRole = role;
    notifyListeners();
  }

  void setAskScore(int nextScore, int streak) {
    score = nextScore;
    streakDays = streak;
    notifyListeners();
  }

  void completeVideoPart(int partIndex) {
    if (partIndex < 0) return;
    if (!_watchedVideoParts.add(partIndex)) return;
    gems += 1;
    notifyListeners();
    _persistLocalWeek();
  }

  void completeWeekQuiz() {
    if (weekQuizDone) return;
    weekQuizDone = true;
    notifyListeners();
    _persistLocalWeek();
  }

  /// Applies admin ledger points after a server award (video, quiz, puzzle, prayer).
  void applyActivityPoints(int points) {
    if (points <= 0) return;
    score += points;
    notifyListeners();
  }

  void completeWeekPuzzle() {
    if (weekPuzzleDone) return;
    weekPuzzleDone = true;
    notifyListeners();
    _persistLocalWeek();
  }

  int? _activeWeek;
  /// Week progress is saved per explorer: siblings share one family phone.
  String _activeProfile = '';
  static const _localWeekPrefix = 'local_week_quest_v2:';

  String _weekKey(int weekNumber) => '$_localWeekPrefix$_activeProfile:$weekNumber';

  /// Bind the explorer to [weekNumber] and its Studio [puzzleId].
  /// Always loads the week's puzzle when the id changes — including the first
  /// bind — so reopen never swaps in the global catalogue puzzle.
  /// [quizDone]/[puzzleDone] from the server keep retries from scoring again.
  void startWeek(
    int weekNumber, {
    bool quizDone = false,
    bool puzzleDone = false,
    String? puzzleId,
    String profile = '',
  }) {
    if (profile != _activeProfile) {
      // Another explorer: drop the last one's week state and solved grid.
      _activeProfile = profile;
      _activeWeek = null;
      _watchedVideoParts.clear();
      weekQuizDone = false;
      weekPuzzleDone = false;
      boundPuzzleId = null;
    }
    final switchingWeek = _activeWeek != null && _activeWeek != weekNumber;
    if (_activeWeek != weekNumber) {
      _activeWeek = weekNumber;
      if (switchingWeek) {
        _watchedVideoParts.clear();
        weekQuizDone = false;
        weekPuzzleDone = false;
      }
      _restoreLocalWeek(weekNumber);
    }

    final id = puzzleId?.trim();
    if (id != null && id.isNotEmpty && boundPuzzleId != id) {
      // Week's attached LIVE puzzle only — never the newest catalogue entry.
      loadDefaultCanonical(puzzleId: id);
    }

    var dirty = false;
    if (quizDone && !weekQuizDone) {
      weekQuizDone = true;
      dirty = true;
    }
    if (puzzleDone && !weekPuzzleDone) {
      weekPuzzleDone = true;
      dirty = true;
    }
    if (dirty) {
      _persistLocalWeek();
      notifyListeners();
    }
  }

  Future<void> _restoreLocalWeek(int weekNumber) async {
    try {
      final profile = _activeProfile;
      final key = _weekKey(weekNumber);
      final prefs = await SharedPreferences.getInstance();
      if (_activeProfile != profile || _activeWeek != weekNumber) return;
      final raw = prefs.getString(key);
      if (raw == null || raw.isEmpty) return;
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return;
      _watchedVideoParts.addAll([
        for (final item in (decoded['watched'] as List? ?? const []))
          if (item is num) item.toInt(),
      ]);
      weekQuizDone = weekQuizDone || decoded['quizDone'] == true;
      weekPuzzleDone = weekPuzzleDone || decoded['puzzleDone'] == true;
      notifyListeners();
    } catch (_) {}
  }

  void _persistLocalWeek() {
    final week = _activeWeek;
    if (week == null) return;
    final key = _weekKey(week);
    final value = jsonEncode({
      'watched': _watchedVideoParts.toList(),
      'quizDone': weekQuizDone,
      'puzzleDone': weekPuzzleDone,
    });
    SharedPreferences.getInstance().then((prefs) => prefs.setString(key, value));
  }

  int get weekVideosDone =>
      _watchedVideoParts.where((index) => index >= 0 && index < 3).length;

  WeekQuestProgress get weekQuest => WeekQuestProgress(
        videosDone: weekVideosDone,
        quizDone: weekQuizDone,
        puzzleDone: weekPuzzleDone || isPuzzleComplete,
        watchedIndexes: Set<int>.of(_watchedVideoParts),
      );

  void addScoreAndGems(int addedScore, int addedGems) {
    score += addedScore;
    gems += addedGems;
    notifyListeners();
  }

  void loadEpisode(PuzzleEpisode ep) {
    episode = ep;
    newlySolvedWord = null;
    _puzzleStartedAt = DateTime.now();
    _puzzleElapsedAtComplete = null;
    _buildGrid();
    if (episode.words.isNotEmpty) {
      selectWord(episode.words.first);
    }
  }

  void _buildGrid() {
    final size = episode.gridSize;
    // Initialize empty cells
    grid = List.generate(
      size,
      (r) => List.generate(
        size,
        (c) => Cell(row: r, col: c, targetLetter: '', wordIds: []),
      ),
    );

    // Populate grid with letters and clue numbers
    for (final word in episode.words) {
      final len = word.answer.length;
      for (int i = 0; i < len; i++) {
        final r = word.direction == Direction.down ? word.startRow + i : word.startRow;
        final c = word.direction == Direction.across ? word.startCol + i : word.startCol;
        final letter = word.answer[i].toUpperCase();

        final current = grid[r][c];
        final wordIds = List<String>.from(current.wordIds)..add(word.id);
        
        final clueNum = i == 0 ? (current.clueNumber ?? word.number) : current.clueNumber;

        grid[r][c] = Cell(
          row: r,
          col: c,
          targetLetter: letter,
          userLetter: current.userLetter,
          clueNumber: clueNum,
          wordIds: wordIds,
          isSolved: current.isSolved,
        );
      }
    }
  }

  int get totalWords => episode.words.length;
  int get solvedWordsCount => episode.words.where((w) => w.isSolved).length;
  bool get isPuzzleComplete => solvedWordsCount == totalWords && totalWords > 0;

  void selectCell(int r, int c) {
    final cell = grid[r][c];
    if (!cell.isLetterCell) return;

    if (cursorRow == r && cursorCol == c && activeWord != null) {
      // Tap again on same cell -> toggle between Across and Down words if available
      final altWordId = cell.wordIds.firstWhere(
        (id) => id != activeWord!.id,
        orElse: () => activeWord!.id,
      );
      final word = episode.words.firstWhere((w) => w.id == altWordId, orElse: () => activeWord!);
      selectWord(word);
      return;
    }

    cursorRow = r;
    cursorCol = c;

    // Pick first word for this cell
    if (cell.wordIds.isNotEmpty) {
      final wordId = cell.wordIds.contains(activeWord?.id) ? activeWord!.id : cell.wordIds.first;
      activeWord = episode.words.firstWhere((w) => w.id == wordId);
    }
    notifyListeners();
  }

  void selectWord(PWord word) {
    activeWord = word;
    cursorRow = word.startRow;
    cursorCol = word.startCol;
    // Shared letters from a finished crossing word stay filled — land on the
    // first cell the player still needs to type.
    _focusFirstEditable();
    notifyListeners();
  }

  void typeLetter(String char) {
    if (activeWord == null) return;
    final cell = grid[cursorRow][cursorCol];
    if (!cell.isLetterCell) return;

    // Locked from a completed crossing word: keep the letter, skip ahead.
    if (cell.isSolved) {
      _advancePastCurrent();
      notifyListeners();
      return;
    }

    cell.userLetter = char.toUpperCase();

    // Check if current word is solved
    _checkWordSolved(activeWord!);

    // Advance past this cell and any already-locked letters that follow.
    _advancePastCurrent();
    _saveProgress();
    notifyListeners();
  }

  void backspace() {
    if (activeWord == null) return;
    final cell = grid[cursorRow][cursorCol];
    if (cell.userLetter.isNotEmpty && !cell.isSolved) {
      cell.userLetter = '';
    } else {
      _retreatCursor();
      final prevCell = grid[cursorRow][cursorCol];
      if (!prevCell.isSolved) {
        prevCell.userLetter = '';
      }
    }
    _saveProgress();
    notifyListeners();
  }

  void useHint() {
    if (activeWord == null || gems < 1 || activeWord!.isSolved) return;

    // Find first empty or wrong letter in activeWord
    final len = activeWord!.answer.length;
    for (int i = 0; i < len; i++) {
      final r = activeWord!.direction == Direction.down ? activeWord!.startRow + i : activeWord!.startRow;
      final c = activeWord!.direction == Direction.across ? activeWord!.startCol + i : activeWord!.startCol;
      final cell = grid[r][c];

      if (cell.userLetter != cell.targetLetter) {
        gems -= 1;
        cell.userLetter = cell.targetLetter;
        cursorRow = r;
        cursorCol = c;
        _checkWordSolved(activeWord!);
        _saveProgress();
        notifyListeners();
        return;
      }
    }
  }

  void _saveProgress() {
    ProgressStore.save(episode.id, serialize());
  }

  void _checkWordSolved(PWord word) {
    final len = word.answer.length;
    bool allCorrect = true;

    for (int i = 0; i < len; i++) {
      final r = word.direction == Direction.down ? word.startRow + i : word.startRow;
      final c = word.direction == Direction.across ? word.startCol + i : word.startCol;
      if (grid[r][c].userLetter != word.answer[i].toUpperCase()) {
        allCorrect = false;
        break;
      }
    }

    if (allCorrect && !word.isSolved) {
      word.isSolved = true;
      gems += 1;

      for (int i = 0; i < len; i++) {
        final r = word.direction == Direction.down ? word.startRow + i : word.startRow;
        final c = word.direction == Direction.across ? word.startCol + i : word.startCol;
        grid[r][c].isSolved = true;
      }

      newlySolvedWord = word;
      if (episode.words.every((w) => w.isSolved)) {
        _puzzleElapsedAtComplete ??=
            DateTime.now().difference(_puzzleStartedAt ?? DateTime.now());
        if (_scoringEnabled && !weekPuzzleDone) {
          // First finish of the week only — later solves are practice.
          score += QuestPoints.puzzle;
          weekPuzzleDone = true;
          _persistLocalWeek();
        }
      }
    }
  }

  void clearNewlySolvedWord() {
    newlySolvedWord = null;
    notifyListeners();
  }

  /// Move to the next cell in the active word that is still editable (not locked).
  void _advancePastCurrent() {
    if (activeWord == null) return;
    final word = activeWord!;
    final isDown = word.direction == Direction.down;
    final currentIdx =
        isDown ? cursorRow - word.startRow : cursorCol - word.startCol;
    for (var i = currentIdx + 1; i < word.answer.length; i++) {
      final r = isDown ? word.startRow + i : word.startRow;
      final c = isDown ? word.startCol : word.startCol + i;
      if (!grid[r][c].isSolved) {
        cursorRow = r;
        cursorCol = c;
        return;
      }
    }
  }

  void _retreatCursor() {
    if (activeWord == null) return;
    final isDown = activeWord!.direction == Direction.down;

    if (isDown) {
      if (cursorRow > activeWord!.startRow) cursorRow -= 1;
    } else {
      if (cursorCol > activeWord!.startCol) cursorCol -= 1;
    }
  }

  Map<String, dynamic> serialize() {
    final entries = <String, String>{};
    for (int r = 0; r < episode.gridSize; r++) {
      for (int c = 0; c < episode.gridSize; c++) {
        final cell = grid[r][c];
        if (cell.isLetterCell && cell.userLetter.isNotEmpty) {
          entries['$r,$c'] = cell.userLetter;
        }
      }
    }
    return {'entries': entries};
  }

  void restore(Map<String, dynamic>? data) {
    if (data == null || data['entries'] == null) return;
    final entries = data['entries'] as Map;
    _scoringEnabled = false;
    try {
      entries.forEach((k, v) {
        final parts = (k as String).split(',');
        if (parts.length == 2) {
          final r = int.tryParse(parts[0]);
          final c = int.tryParse(parts[1]);
          if (r != null && c != null && r < grid.length && c < grid[r].length) {
            grid[r][c].userLetter = (v as String).toUpperCase();
          }
        }
      });

      for (final w in episode.words) {
        _checkWordSolved(w);
      }
    } finally {
      _scoringEnabled = true;
    }
    _focusFirstEmpty();
    notifyListeners();
  }

  void _focusFirstEmpty() {
    _focusFirstEditable();
  }

  /// Prefer the first empty cell; otherwise the first unlocked cell in the word.
  void _focusFirstEditable() {
    if (activeWord == null) return;
    final word = activeWord!;
    final isDown = word.direction == Direction.down;
    int? firstUnlocked;
    for (var i = 0; i < word.answer.length; i++) {
      final r = isDown ? word.startRow + i : word.startRow;
      final c = isDown ? word.startCol : word.startCol + i;
      final cell = grid[r][c];
      if (cell.isSolved) continue;
      firstUnlocked ??= i;
      if (cell.userLetter.isEmpty) {
        cursorRow = r;
        cursorCol = c;
        return;
      }
    }
    if (firstUnlocked != null) {
      final i = firstUnlocked;
      cursorRow = isDown ? word.startRow + i : word.startRow;
      cursorCol = isDown ? word.startCol : word.startCol + i;
    }
  }
}
