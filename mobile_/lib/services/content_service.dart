import 'package:dio/dio.dart';
import 'api_client.dart';
import '../models/api_models.dart';
import '../models/auth_session.dart';

/// Content Service for Teen Quest weeks from the backend.
class ContentService {
  final ApiClient _apiClient;

  ContentService(this._apiClient);

  /// Get all published Teen Quest weeks
  Future<List<TeenQuest>> getTeenQuestWeeks() async {
    try {
      final response = await _apiClient.dio.get('/api/teen-quest/weeks');
      return (response.data as List)
          .map((e) => TeenQuest.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// The signed-in explorer's self-paced week. Null in demo sessions.
  Future<CurrentQuest?> getCurrentQuest({String? childId}) async {
    try {
      final response = await _apiClient.dio.get(
        '/api/teen-quest/current',
        queryParameters: {
          if (childId != null && childId.isNotEmpty) 'childId': childId,
        },
      );
      return CurrentQuest.fromJson(Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Finished videos / quiz / puzzle for one week (cross-device).
  Future<WeekActivityProgress?> getWeekProgress({
    required int weekNumber,
    String? childId,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        '/api/teen-quest/weeks/$weekNumber/progress',
        queryParameters: {
          if (childId != null && childId.isNotEmpty) 'childId': childId,
        },
      );
      if (response.data is! Map) return null;
      return WeekActivityProgress.fromJson(Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Records the week's quiz (`QUIZ`) or puzzle (`PUZZLE`) and returns the updated position.
  /// Quiz steps also award admin `TEEN_QUEST_OBJS` points.
  Future<QuestStepResult> completeQuestStep({
    required int weekNumber,
    required String step,
    String? childId,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        '/api/teen-quest/weeks/$weekNumber/steps',
        data: {
          'step': step,
          if (childId != null && childId.isNotEmpty) 'childId': childId,
        },
      );
      final map = Map<String, dynamic>.from(response.data as Map);
      return QuestStepResult(
        current: CurrentQuest.fromJson(map),
        award: ActivityAward.fromJson(map),
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Get specific Teen Quest week with quizzes
  Future<TeenQuest> getTeenQuestWeek(int weekNumber) async {
    try {
      final response = await _apiClient.dio.get('/api/teen-quest/weeks/$weekNumber');
      return TeenQuest.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Submit Objective Quiz
  Future<QuizSubmissionResult> submitObjectiveQuiz({
    required String classId,
    required String questId,
    required String childId,
    required List<Object> answers,
  }) async {
    try {
      final response = await _apiClient.dio.post('/api/teen-quest/submit-objs', data: {
        'classId': classId,
        'questId': questId,
        'childId': childId,
        'answers': answers,
      });
      return QuizSubmissionResult.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Get class leaderboard
  Future<List<LeaderboardEntry>> getClassLeaderboard(String classId) async {
    try {
      final response = await _apiClient.dio.get('/api/engagement/leaderboard/$classId');
      return (response.data as List)
          .map((e) => LeaderboardEntry.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  CurriculumTrack manageTrackFor(AuthSession session) {
    if (session.isParent) return CurriculumTrack.home;
    return CurriculumTrack.personal;
  }

  Future<List<TeenQuest>> getLearningPlan(
    CurriculumTrack track, {
    String? childId,
  }) async {
    return const [];
  }

  Future<List<LearningTrackView>> getAssignedTracks(AuthSession session) async {
    final tracks = <LearningTrackView>[];
    if (session.isParent) {
      tracks.add(LearningTrackView(
        track: CurriculumTrack.home,
        label: 'What to learn',
        weeks: await getLearningPlan(CurriculumTrack.home),
      ));
      return tracks;
    }
    if (session.familyClass != null) {
      tracks.add(LearningTrackView(
        track: CurriculumTrack.home,
        label: 'Home',
        weeks: await getLearningPlan(CurriculumTrack.home),
      ));
    }
    if (session.isAdultTeen) {
      tracks.add(LearningTrackView(
        track: CurriculumTrack.personal,
        label: 'My weeks',
        weeks: await getLearningPlan(CurriculumTrack.personal, childId: session.childId),
      ));
    }
    return tracks;
  }

  Future<bool> isWeekOnPlan(
    CurriculumTrack track,
    String questId, {
    String? childId,
  }) async {
    final plan = await getLearningPlan(track, childId: childId);
    return plan.any((week) => week.id == questId);
  }

  Future<void> addWeekToPlan(
    CurriculumTrack track,
    String questId, {
    String? childId,
  }) async {
  }

  Future<void> removeWeekFromPlan(
    CurriculumTrack track,
    String questId, {
    String? childId,
  }) async {
  }

  /// Posts VIDEO_WATCH; points come from admin scoring rules.
  Future<ActivityAward> markVideoWatched({
    required int weekNumber,
    required String videoId,
    String? childId,
  }) async {
    try {
      final response = await _apiClient.dio.post('/api/engagement/complete', data: {
        'activityType': 'VIDEO_WATCH',
        'refKey': videoId,
        'weekNumber': weekNumber,
        if (childId != null && childId.isNotEmpty) 'childId': childId,
      });
      return ActivityAward.fromJson(response.data);
    } on DioException catch (e) {
      assert(() {
        // ignore: avoid_print
        print('markVideoWatched failed: ${e.response?.statusCode} ${e.response?.data}');
        return true;
      }());
      return ActivityAward.failed;
    }
  }

  /// Posts PRAYER_DECLARATION; points come from admin scoring rules.
  Future<ActivityAward> markPrayerDeclared({
    required String refKey,
    String? childId,
  }) async {
    try {
      final response = await _apiClient.dio.post('/api/engagement/complete', data: {
        'activityType': 'PRAYER_DECLARATION',
        'refKey': refKey,
        if (childId != null && childId.isNotEmpty) 'childId': childId,
      });
      return ActivityAward.fromJson(response.data);
    } on DioException catch (e) {
      assert(() {
        // ignore: avoid_print
        print('markPrayerDeclared failed: ${e.response?.statusCode} ${e.response?.data}');
        return true;
      }());
      return ActivityAward.failed;
    }
  }

  bool isVideoWatched(TeenQuest week, String videoId, {String? childId}) {
    return false;
  }

  bool weekVideosComplete(TeenQuest week, {String? childId}) {
    return false;
  }

  /// Live crossword for a quest week. Requires [puzzleId] — never the global catalogue.
  Future<LivePuzzleResponse?> getLivePuzzle({String? puzzleId}) async {
    final id = puzzleId?.trim();
    if (id == null || id.isEmpty) return null;
    try {
      final response = await _apiClient.dio.get('/api/puzzles/id/$id/live');
      if (response.data is Map) {
        final data = Map<String, dynamic>.from(response.data as Map);
        if (data['doc'] is Map) {
          return LivePuzzleResponse(
            versionId: data['id']?.toString() ?? '',
            puzzleKey: data['puzzleKey']?.toString() ?? '',
            title: data['title']?.toString() ?? '',
            version: (data['version'] as num?)?.toInt() ?? 1,
            doc: Map<String, dynamic>.from(data['doc'] as Map),
          );
        }
      }
      return null;
    } on DioException {
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Live match game for a quest week. Requires [matchingId].
  Future<LiveMatchingResponse?> getLiveMatching({required String matchingId}) async {
    final id = matchingId.trim();
    if (id.isEmpty) return null;
    try {
      final response = await _apiClient.dio.get('/api/matchings/id/$id/live');
      if (response.data is Map) {
        final data = Map<String, dynamic>.from(response.data as Map);
        if (data['doc'] is Map) {
          return LiveMatchingResponse(
            versionId: data['id']?.toString() ?? '',
            matchingKey: data['matchingKey']?.toString() ?? '',
            title: data['title']?.toString() ?? '',
            version: (data['version'] as num?)?.toInt() ?? 1,
            doc: Map<String, dynamic>.from(data['doc'] as Map),
          );
        }
      }
      return null;
    } on DioException {
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Claims puzzle reward; points come from admin scoring rules.
  Future<ActivityAward> claimPuzzleReward(String puzzleVersionId, {String? childId}) async {
    try {
      final response = await _apiClient.dio.post(
        '/api/puzzles/versions/$puzzleVersionId/claim-reward',
        data: childId != null && childId.isNotEmpty ? {'childId': childId} : {},
      );
      return ActivityAward.fromJson(response.data);
    } on DioException {
      return ActivityAward.failed;
    } catch (_) {
      return ActivityAward.failed;
    }
  }

  /// Claims match-game reward (same PUZZLE_SOLVE scoring bucket).
  Future<ActivityAward> claimMatchingReward(String matchingVersionId, {String? childId}) async {
    try {
      final response = await _apiClient.dio.post(
        '/api/matchings/versions/$matchingVersionId/claim-reward',
        data: childId != null && childId.isNotEmpty ? {'childId': childId} : {},
      );
      return ActivityAward.fromJson(response.data);
    } on DioException {
      return ActivityAward.failed;
    } catch (_) {
      return ActivityAward.failed;
    }
  }
}

class QuestStepResult {
  const QuestStepResult({this.current, required this.award});
  final CurrentQuest? current;
  final ActivityAward award;
}

/// Result of an engagement / puzzle award from the server.
class ActivityAward {
  const ActivityAward({
    required this.ok,
    required this.points,
    required this.alreadyAwarded,
    this.videoPoints,
    this.quizPoints,
    this.puzzlePoints,
    this.prayerPoints,
  });

  final bool ok;
  final int points;
  final bool alreadyAwarded;
  final int? videoPoints;
  final int? quizPoints;
  final int? puzzlePoints;
  final int? prayerPoints;

  static const failed = ActivityAward(ok: false, points: 0, alreadyAwarded: false);

  bool get awardedFresh => ok && !alreadyAwarded && points > 0;

  factory ActivityAward.fromJson(Object? raw) {
    if (raw is! Map) return failed;
    final map = Map<String, dynamic>.from(raw);
    final rules = map['activityPoints'];
    int? rule(String key) {
      if (rules is! Map) return null;
      final v = rules[key];
      return v is num ? v.toInt() : null;
    }

    return ActivityAward(
      ok: true,
      points: (map['points'] as num?)?.toInt() ?? 0,
      alreadyAwarded: map['alreadyAwarded'] == true,
      videoPoints: rule('VIDEO_WATCH'),
      quizPoints: rule('TEEN_QUEST_OBJS'),
      puzzlePoints: rule('PUZZLE_SOLVE'),
      prayerPoints: rule('PRAYER_DECLARATION'),
    );
  }
}

class LivePuzzleResponse {
  final String versionId;
  final String puzzleKey;
  final String title;
  final int version;
  final Map<String, dynamic> doc;

  const LivePuzzleResponse({
    required this.versionId,
    required this.puzzleKey,
    required this.title,
    required this.version,
    required this.doc,
  });
}

class LiveMatchingResponse {
  final String versionId;
  final String matchingKey;
  final String title;
  final int version;
  final Map<String, dynamic> doc;

  const LiveMatchingResponse({
    required this.versionId,
    required this.matchingKey,
    required this.title,
    required this.version,
    required this.doc,
  });
}

