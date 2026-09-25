import 'package:flutter/material.dart';
import 'puzzle.dart';
import 'progress_store.dart';
import 'puzzle_contract.dart';
import 'puzzle_contract_loader.dart';
import '../data/episodes.dart';
import '../data/quest_points.dart';
import 'week_quest_progress.dart';

enum UserRole { student, parent }

/// How the puzzle screen should present load outcome (never via thrown errors).
enum PuzzleScreenState { loading, ready, rejected, unsupported }

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
  int score = 120;
  int streakDays = 5;

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

  PWord? newlySolvedWord;
  bool _scoringEnabled = true;
  final PuzzleContractLoader _contractLoader;

  GameController({
    PuzzleEpisode? initialEpisode,
    PuzzleContractLoader? contractLoader,
  }) : _contractLoader = contractLoader ?? const PuzzleContractLoader() {
    // Sync bootstrap keeps existing screens usable before the canonical asset loads.
    loadEpisode(initialEpisode ?? SampleEpisodes.episode1);
    if (initialEpisode == null) {
      puzzleScreenState = PuzzleScreenState.loading;
    } else {
      puzzleScreenState = PuzzleScreenState.ready;
    }
  }

  /// Replace current puzzle loading with the canonical contract golden.
  Future<void> loadDefaultCanonical({
    String assetPath = kDefaultCanonicalAsset,
  }) async {
    puzzleScreenState = PuzzleScreenState.loading;
    puzzleStatusMessage = null;
    unsupportedPuzzle = null;
    notifyListeners();

    final result = await _contractLoader.loadAsset(assetPath);
    applyLoadResult(result);
  }

  /// Apply a parse/guard result without throwing.
  void applyLoadResult(PuzzleLoadResult result) {
    switch (result) {
      case PuzzleRejected(:final message):
        puzzleScreenState = PuzzleScreenState.rejected;
        puzzleStatusMessage = message;
        unsupportedPuzzle = null;
        notifyListeners();
      case PuzzleLoaded(:final envelope):
        final data = envelope.data;
        switch (data) {
          case CrosswordData():
            loadEpisode(crosswordToEpisode(envelope, data));
            puzzleScreenState = PuzzleScreenState.ready;
            puzzleStatusMessage = null;
            unsupportedPuzzle = null;
            notifyListeners();
          case MatchingData():
            // Matching is parsed but not yet playable on this screen.
            puzzleScreenState = PuzzleScreenState.unsupported;
            unsupportedPuzzle = UnsupportedPuzzle(
              rawType: 'MATCHING',
              schemaVersion: envelope.schemaVersion,
              reason: 'matching_not_playable_yet',
            );
            puzzleStatusMessage =
                'This matching puzzle needs a newer version of the app.';
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
    score += QuestPoints.video;
    gems += 1;
    notifyListeners();
  }

  void completeWeekQuiz() {
    if (weekQuizDone) return;
    weekQuizDone = true;
    notifyListeners();
  }

  void completeWeekPuzzle() {
    if (weekPuzzleDone) return;
    weekPuzzleDone = true;
    notifyListeners();
  }

  int get weekVideosDone =>
      _watchedVideoParts.where((index) => index >= 0 && index < 3).length;

  WeekQuestProgress get weekQuest => WeekQuestProgress(
        videosDone: weekVideosDone,
        quizDone: weekQuizDone,
        puzzleDone: weekPuzzleDone || isPuzzleComplete,
      );

  void addScoreAndGems(int addedScore, int addedGems) {
    score += addedScore;
    gems += addedGems;
    notifyListeners();
  }

  void loadEpisode(PuzzleEpisode ep) {
    episode = ep;
    newlySolvedWord = null;
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
    notifyListeners();
  }

  void typeLetter(String char) {
    if (activeWord == null) return;
    final cell = grid[cursorRow][cursorCol];
    if (!cell.isLetterCell || cell.isSolved) return;

    cell.userLetter = char.toUpperCase();

    // Check if current word is solved
    _checkWordSolved(activeWord!);

    // Advance cursor to next letter cell in word
    _advanceCursor();
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
      if (_scoringEnabled && episode.words.every((w) => w.isSolved)) {
        score += QuestPoints.puzzle;
        weekPuzzleDone = true;
      }
    }
  }

  void clearNewlySolvedWord() {
    newlySolvedWord = null;
    notifyListeners();
  }

  void _advanceCursor() {
    if (activeWord == null) return;
    final isDown = activeWord!.direction == Direction.down;
    final endRow = isDown ? activeWord!.startRow + activeWord!.answer.length - 1 : activeWord!.startRow;
    final endCol = isDown ? activeWord!.startCol : activeWord!.startCol + activeWord!.answer.length - 1;

    if (isDown) {
      if (cursorRow < endRow) cursorRow += 1;
    } else {
      if (cursorCol < endCol) cursorCol += 1;
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
    if (activeWord == null) return;
    final len = activeWord!.answer.length;
    for (int i = 0; i < len; i++) {
      final r = activeWord!.direction == Direction.down ? activeWord!.startRow + i : activeWord!.startRow;
      final c = activeWord!.direction == Direction.across ? activeWord!.startCol + i : activeWord!.startCol;
      if (grid[r][c].userLetter.isEmpty) {
        cursorRow = r;
        cursorCol = c;
        return;
      }
    }
  }
}
