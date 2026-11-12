import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/api_models.dart';
import '../models/week_quest_progress.dart';
import '../services/content_service.dart';
import '../services/error_text.dart';

/// The explorer's self-paced week from the backend, or the last copy saved on
/// this device. Finished activities are posted to the server and retried so
/// every device on the account sees the same completed quest steps.
class CurrentQuestProvider extends ChangeNotifier {
  CurrentQuestProvider(
    ContentService? content, {
    SharedPreferences? prefs,
    Future<bool> Function()? online,
    Future<CurrentQuest?> Function()? fetch,
    Future<CurrentQuest?> Function(int weekNumber, String step)? complete,
    Future<TeenQuest> Function(int weekNumber)? loadWeek,
    Future<WeekActivityProgress?> Function(int weekNumber)? loadWeekProgress,
    Future<ActivityAward> Function(int weekNumber, String videoId)? markVideo,
    this.onVideoPoints,
  })  : _content = content,
        _prefs = prefs,
        _online = online ?? _deviceOnline,
        _fetchOverride = fetch,
        _completeOverride = complete,
        _loadWeek = loadWeek ?? (content == null ? null : content.getTeenQuestWeek),
        _loadWeekProgressOverride = loadWeekProgress,
        _markVideoOverride = markVideo;

  static const _cachePrefix = 'current_quest_v1:';
  static const _pendingPrefix = 'pending_quest_sync_v1:';

  final ContentService? _content;
  final SharedPreferences? _prefs;
  final Future<bool> Function() _online;
  final Future<CurrentQuest?> Function()? _fetchOverride;
  final Future<CurrentQuest?> Function(int weekNumber, String step)? _completeOverride;
  final Future<TeenQuest> Function(int weekNumber)? _loadWeek;
  final Future<WeekActivityProgress?> Function(int weekNumber)? _loadWeekProgressOverride;
  final Future<ActivityAward> Function(int weekNumber, String videoId)? _markVideoOverride;
  final void Function(int points)? onVideoPoints;

  CurrentQuest? _current;
  /// The week the server says this explorer is on. Browsing does not change it.
  CurrentQuest? _anchor;
  int? _browsedWeek;
  bool _loading = false;
  bool _switching = false;
  bool _synced = false;
  bool _offline = false;
  String? _error;
  String? _identity;
  String? _childId;
  final Set<String> _pendingVideos = {};
  final Set<String> _pendingSteps = {};

  CurrentQuest? get current => _current;
  bool get isLoading => !_synced || _loading;
  bool get isOffline => _offline;
  String? get error => _error;

  /// True while the map is showing a week other than the saved home position.
  bool get isBrowsing => _browsedWeek != null;

  /// Highest / real progress week. Unchanged while the explorer browses another week.
  CurrentQuest? get progressAnchor => _anchor ?? _current;

  Future<CurrentQuest?> _fetch() {
    final override = _fetchOverride;
    if (override != null) return override();
    return _content!.getCurrentQuest(childId: _childId);
  }

  Future<QuestStepResult> _complete(int weekNumber, String step, {List<Object>? answers}) async {
    final override = _completeOverride;
    if (override != null) {
      final next = await override(weekNumber, step);
      if (next == null) {
        return const QuestStepResult(
          current: null,
          award: ActivityAward.failed,
        );
      }
      return QuestStepResult(current: next, award: ActivityAward.failed);
    }
    return _content!.completeQuestStep(
      weekNumber: weekNumber,
      step: step,
      childId: _childId,
      answers: answers,
    );
  }

  Future<WeekActivityProgress?> Function(int weekNumber)? get _loadWeekProgress {
    final override = _loadWeekProgressOverride;
    if (override != null) return override;
    final content = _content;
    if (content == null) return null;
    return (week) => content.getWeekProgress(weekNumber: week, childId: _childId);
  }

  Future<ActivityAward> _markVideo(int weekNumber, String videoId) async {
    final override = _markVideoOverride;
    if (override != null) return override(weekNumber, videoId);
    return _content!.markVideoWatched(
      weekNumber: weekNumber,
      videoId: videoId,
      childId: _childId,
    );
  }

  /// Progress for the home cards. Any finished lesson counts, in any order.
  WeekQuestProgress? get progress {
    final c = _current;
    if (c == null) return null;
    final watched = {...c.watchedVideoIds, ..._pendingVideos};
    final indexes = <int>{};
    for (var i = 0; i < c.quest.videos.length; i++) {
      if (watched.contains(c.quest.videos[i].id)) indexes.add(i);
    }
    return WeekQuestProgress(
      videosDone: indexes.length,
      quizDone: c.quizDone || _pendingSteps.contains("${c.weekNumber}:QUIZ"),
      puzzleDone: c.puzzleDone || _pendingSteps.contains("${c.weekNumber}:PUZZLE"),
      videoCount: c.quest.videos.length,
      watchedIndexes: indexes,
    );
  }

  /// Shows a lesson as watched on Home immediately, before the server answers.
  void rememberWatched(String videoId) {
    final c = _current;
    if (c == null || videoId.isEmpty || c.watchedVideoIds.contains(videoId)) return;
    _current = CurrentQuest(
      quest: c.quest,
      weekNumber: c.weekNumber,
      totalWeeks: c.totalWeeks,
      weeksCompleted: c.weeksCompleted,
      caughtUp: c.caughtUp,
      tracked: c.tracked,
      watchedVideoIds: [...c.watchedVideoIds, videoId],
      quizDone: c.quizDone,
      puzzleDone: c.puzzleDone,
      videoPoints: c.videoPoints,
      quizPoints: c.quizPoints,
      puzzlePoints: c.puzzlePoints,
      prayerPoints: c.prayerPoints,
      awaitingNextWeek: c.awaitingNextWeek,
      nextWeekOpensAt: c.nextWeekOpensAt,
      declarationLastAt: c.declarationLastAt,
    );
    if (_browsedWeek == null) _anchor = _current;
    notifyListeners();
    if (_browsedWeek == null) _writeCache(_current!);
  }

  /// Optimistic local watch + POST to the ledger (queued for retry on failure).
  /// Returns admin points awarded for a fresh completion (0 if queued / already counted).
  Future<int> recordVideoWatched({
    required String videoId,
    required int weekNumber,
  }) async {
    if (videoId.isEmpty) return 0;
    final identity = _identity;
    rememberWatched(videoId);
    _pendingVideos.add(videoId);
    await _writePending();
    if (!await _online() || identity != _identity) return 0;
    final award = await _markVideo(weekNumber, videoId);
    if (identity != _identity || !award.ok) return 0;
    _acceptVideoAward(videoId, award);
    await _writePending();
    return award.awardedFresh ? award.points : 0;
  }

  void _acceptVideoAward(String videoId, ActivityAward award) {
    _pendingVideos.remove(videoId);
    if (award.awardedFresh) onVideoPoints?.call(award.points);
    _applyActivityPointsFromAward(award);
  }

  void _applyActivityPointsFromAward(ActivityAward award) {
    final c = _current;
    if (c == null || !award.ok) return;
    if (award.videoPoints == null &&
        award.quizPoints == null &&
        award.puzzlePoints == null &&
        award.prayerPoints == null) {
      return;
    }
    _current = c.withActivityPoints(
      videoPoints: award.videoPoints,
      quizPoints: award.quizPoints,
      puzzlePoints: award.puzzlePoints,
      prayerPoints: award.prayerPoints,
    );
    if (_browsedWeek == null) {
      _anchor = _current;
      _writeCache(_current!);
    }
    notifyListeners();
  }

  /// Sets quest-of-the-day to [weekNumber] without moving the saved/highest level.
  /// Used by the quest map; home no longer has previous/next week controls.
  Future<void> browseToWeek(int weekNumber) async {
    final shown = _current;
    final load = _loadWeek;
    if (shown == null || load == null || _switching) return;
    final total = shown.totalWeeks;
    if (weekNumber < 1 || (total > 0 && weekNumber > total)) return;
    final anchor = _anchor;
    if (anchor != null && weekNumber == anchor.weekNumber) {
      _browsedWeek = null;
      _current = anchor;
      notifyListeners();
      return;
    }
    final identity = _identity;
    _switching = true;
    notifyListeners();
    try {
      final quest = await load(weekNumber);
      if (identity != _identity) return;
      WeekActivityProgress? remoteProgress;
      final loadProgress = _loadWeekProgress;
      if (loadProgress != null && shown.tracked) {
        try {
          remoteProgress = await loadProgress(quest.weekNumber);
        } catch (_) {}
      }
      if (identity != _identity) return;
      _browsedWeek = quest.weekNumber;
      _current = CurrentQuest(
        quest: quest,
        weekNumber: quest.weekNumber,
        totalWeeks: total > 0 ? total : quest.weekNumber,
        weeksCompleted: anchor?.weeksCompleted ?? shown.weeksCompleted,
        caughtUp: false,
        tracked: shown.tracked,
        watchedVideoIds: remoteProgress?.watchedVideoIds ?? const [],
        quizDone: remoteProgress?.quizDone ?? false,
        puzzleDone: remoteProgress?.puzzleDone ?? false,
        videoPoints: shown.videoPoints,
        quizPoints: shown.quizPoints,
        puzzlePoints: shown.puzzlePoints,
        prayerPoints: shown.prayerPoints,
        awaitingNextWeek: false,
        nextWeekOpensAt: null,
        declarationLastAt: remoteProgress?.declarationLastAt,
      );
      _error = null;
    } catch (e) {
      if (identity == _identity) _error = errorText(e);
    } finally {
      if (identity == _identity) {
        _switching = false;
        notifyListeners();
      }
    }
  }

  Future<void> refresh() async {
    final identity = _identity;
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      await _flushPending();
      if (identity != _identity) return;
      final next = await _fetch();
      if (identity != _identity) return;
      if (next != null) {
        final base = _browsedWeek == null ? _current : _anchor;
        _anchor = CurrentQuest.preferLocalProgress(base, next);
        // Pull-to-refresh must re-read the week document from the DB so title,
        // videos, quiz, and puzzleId update — not only progress flags.
        final shownWeek = _browsedWeek ?? _anchor!.weekNumber;
        final freshQuest = await _reloadWeekDoc(shownWeek) ??
            (shownWeek == _anchor!.weekNumber ? _anchor!.quest : _current?.quest);
        if (identity != _identity) return;
        if (freshQuest != null) {
          if (shownWeek == _anchor!.weekNumber) {
            _browsedWeek = null;
            _anchor = _withQuest(_anchor!, freshQuest);
            _current = _anchor;
          } else {
            final shown = _current;
            WeekActivityProgress? remoteProgress;
            final loadProgress = _loadWeekProgress;
            if (loadProgress != null && _anchor!.tracked) {
              try {
                remoteProgress = await loadProgress(freshQuest.weekNumber);
              } catch (_) {}
            }
            if (identity != _identity) return;
            _current = CurrentQuest(
              quest: freshQuest,
              weekNumber: freshQuest.weekNumber,
              totalWeeks: _anchor!.totalWeeks,
              weeksCompleted: _anchor!.weeksCompleted,
              caughtUp: false,
              tracked: _anchor!.tracked,
              watchedVideoIds: remoteProgress?.watchedVideoIds ??
                  (shown?.weekNumber == freshQuest.weekNumber ? shown!.watchedVideoIds : const []),
              quizDone: remoteProgress?.quizDone ??
                  (shown?.weekNumber == freshQuest.weekNumber ? shown!.quizDone : false),
              puzzleDone: remoteProgress?.puzzleDone ??
                  (shown?.weekNumber == freshQuest.weekNumber ? shown!.puzzleDone : false),
              videoPoints: _anchor!.videoPoints,
              quizPoints: _anchor!.quizPoints,
              awaitingNextWeek: false,
              nextWeekOpensAt: null,
              declarationLastAt: remoteProgress?.declarationLastAt ??
                  (shown?.weekNumber == freshQuest.weekNumber ? shown!.declarationLastAt : null),
              puzzlePoints: _anchor!.puzzlePoints,
              prayerPoints: _anchor!.prayerPoints,
            );
          }
        } else if (_browsedWeek == null || _browsedWeek == _anchor!.weekNumber) {
          _browsedWeek = null;
          _current = _anchor;
        }
        _offline = false;
        await _writeCache(_anchor!);
      }
    } catch (e) {
      final offline = !await _online();
      if (identity != _identity) return;
      _error = errorText(e);
      _offline = offline;
      // Keep the last device copy so returning users do not restart the week.
      if (_current == null && _identity != null) {
        _current = _readCache(_identity!);
      }
    } finally {
      if (identity == _identity) {
        _loading = false;
        _synced = true;
        notifyListeners();
      }
    }
  }

  Future<TeenQuest?> _reloadWeekDoc(int weekNumber) async {
    final load = _loadWeek;
    if (load == null) return null;
    try {
      return await load(weekNumber);
    } catch (_) {
      return null;
    }
  }

  static CurrentQuest _withQuest(CurrentQuest base, TeenQuest quest) {
    return CurrentQuest(
      quest: quest,
      weekNumber: base.weekNumber,
      totalWeeks: base.totalWeeks,
      weeksCompleted: base.weeksCompleted,
      caughtUp: base.caughtUp,
      tracked: base.tracked,
      watchedVideoIds: base.watchedVideoIds,
      quizDone: base.quizDone,
      puzzleDone: base.puzzleDone,
      videoPoints: base.videoPoints,
      quizPoints: base.quizPoints,
      puzzlePoints: base.puzzlePoints,
      prayerPoints: base.prayerPoints,
      awaitingNextWeek: base.awaitingNextWeek,
      nextWeekOpensAt: base.nextWeekOpensAt,
      declarationLastAt: base.declarationLastAt,
    );
  }

  /// Marks quiz/puzzle done on the server. Returns admin points for a fresh quiz award.
  /// Quiz [answers] are graded by the server; without them the step counts but earns no points.
  Future<int> completeStep(String step, {List<Object>? answers}) async {
    final c = _current;
    if (c == null) return 0;
    final identity = _identity;
    final weekNumber = c.weekNumber;
    final key = '$weekNumber:$step';
    try {
      final result = await _complete(weekNumber, step, answers: answers);
      if (identity != _identity) return 0;
      final next = result.current;
      _pendingSteps.remove(key);
      await _writePending();
      if (identity != _identity) return 0;
      if (_browsedWeek != null) {
        _current = c.withStep(step);
        notifyListeners();
      } else if (next != null) {
        _current = CurrentQuest.preferLocalProgress(c.withStep(step), next);
        _anchor = _current;
        await _writeCache(_current!);
        notifyListeners();
      }
      return result.award.awardedFresh ? result.award.points : 0;
    } catch (e) {
      if (identity != _identity) return 0;
      // Save the step on device so the journey continues offline; retry later.
      _pendingSteps.add(key);
      await _writePending();
      if (identity != _identity) return 0;
      _current = c.withStep(step);
      if (_browsedWeek == null) {
        _anchor = _current;
        await _writeCache(_current!);
      }
      _error = errorText(e);
      notifyListeners();
      return 0;
    }
  }

  /// Reloads when the signed-in account or active explorer changes; clears on sign-out.
  void syncIdentity({required bool authenticated, String? userId, String? childId}) {
    final identity = authenticated ? '${userId ?? ''}|${childId ?? ''}' : null;
    if (identity == _identity && _synced && childId == _childId) return;
    _identity = identity;
    _childId = childId;
    _error = null;
    _offline = false;
    _loading = false;
    _switching = false;
    _browsedWeek = null;
    _pendingVideos.clear();
    _pendingSteps.clear();
    _current = identity == null ? null : _readCache(identity);
    _anchor = _current;
    if (identity != null) _readPending(identity);
    if (identity == null) {
      _synced = true;
      notifyListeners();
      return;
    }
    _synced = true;
    refresh();
  }

  Future<void> _flushPending() async {
    final identity = _identity;
    if (_pendingVideos.isEmpty && _pendingSteps.isEmpty) return;
    if (!await _online() || identity != _identity) return;
    final weekNumber = _current?.weekNumber ?? _anchor?.weekNumber ?? 1;

    final videos = _pendingVideos.toList();
    for (final videoId in videos) {
      final award = await _markVideo(weekNumber, videoId);
      if (identity != _identity) return;
      if (award.ok) _acceptVideoAward(videoId, award);
    }

    final steps = _pendingSteps.toList();
    for (final key in steps) {
      final parts = key.split(':');
      if (parts.length != 2) {
        _pendingSteps.remove(key);
        continue;
      }
      final week = int.tryParse(parts[0]);
      final step = parts[1];
      if (week == null || (step != 'QUIZ' && step != 'PUZZLE')) {
        _pendingSteps.remove(key);
        continue;
      }
      try {
        await _complete(week, step);
        if (identity != _identity) return;
        _pendingSteps.remove(key);
      } catch (_) {
        if (identity != _identity) return;
      }
    }
    await _writePending();
  }

  CurrentQuest? _readCache(String identity) {
    final raw = _prefs?.getString('$_cachePrefix$identity');
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return null;
      return CurrentQuest.fromJson(Map<String, dynamic>.from(decoded));
    } catch (_) {
      return null;
    }
  }

  Future<void> _writeCache(CurrentQuest quest) {
    final identity = _identity;
    final prefs = _prefs;
    if (identity == null || prefs == null) return Future.value();
    return prefs.setString('$_cachePrefix$identity', jsonEncode(quest.toJson()));
  }

  void _readPending(String identity) {
    final raw = _prefs?.getString('$_pendingPrefix$identity');
    if (raw == null || raw.isEmpty) return;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return;
      final map = Map<String, dynamic>.from(decoded);
      for (final id in (map['videos'] as List? ?? const [])) {
        final s = id.toString();
        if (s.isNotEmpty) _pendingVideos.add(s);
      }
      for (final key in (map['steps'] as List? ?? const [])) {
        final s = key.toString();
        if (s.isNotEmpty) _pendingSteps.add(s);
      }
    } catch (_) {}
  }

  Future<void> _writePending() {
    final identity = _identity;
    final prefs = _prefs;
    if (identity == null || prefs == null) return Future.value();
    if (_pendingVideos.isEmpty && _pendingSteps.isEmpty) {
      return prefs.remove('$_pendingPrefix$identity');
    }
    return prefs.setString(
      '$_pendingPrefix$identity',
      jsonEncode({
        'videos': _pendingVideos.toList(),
        'steps': _pendingSteps.toList(),
      }),
    );
  }
}

Future<bool> _deviceOnline() async {
  try {
    final result = await Connectivity().checkConnectivity();
    return result != ConnectivityResult.none;
  } catch (_) {
    return true;
  }
}
