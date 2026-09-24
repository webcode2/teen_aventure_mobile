import 'package:dio/dio.dart';
import '../config/demo_account.dart';
import 'api_client.dart';
import '../models/api_models.dart';
import '../models/auth_session.dart';

/// Content Service for Teen Quest weeks from the backend.
class ContentService {
  final ApiClient _apiClient;

  ContentService(this._apiClient);

  /// Get all published Teen Quest weeks
  Future<List<TeenQuest>> getTeenQuestWeeks() async {
    if (_apiClient.isDemoSession) return DemoAccount.demoWeeks();
    try {
      final response = await _apiClient.dio.get('/api/teen-quest/weeks');
      return (response.data as List)
          .map((e) => TeenQuest.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Get specific Teen Quest week with quizzes
  Future<TeenQuest> getTeenQuestWeek(int weekNumber) async {
    if (_apiClient.isDemoSession) {
      for (final week in DemoAccount.demoWeeks()) {
        if (week.weekNumber == weekNumber) return week;
      }
      throw ApiException(message: 'Demo week $weekNumber not found');
    }
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
    required List<int> answers,
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
    if (_apiClient.isDemoSession) {
      return DemoAccount.demoLeaderboard(_apiClient.getAuthToken(), classId: classId);
    }
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
    if (_apiClient.isDemoSession) {
      return DemoAccount.planWeeks(track, childId: childId);
    }
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
    if (_apiClient.isDemoSession) {
      return DemoAccount.isInPlan(track, questId, childId: childId);
    }
    final plan = await getLearningPlan(track, childId: childId);
    return plan.any((week) => week.id == questId);
  }

  Future<void> addWeekToPlan(
    CurriculumTrack track,
    String questId, {
    String? childId,
  }) async {
    if (_apiClient.isDemoSession) {
      DemoAccount.addToPlan(track, questId, childId: childId);
    }
  }

  Future<void> removeWeekFromPlan(
    CurriculumTrack track,
    String questId, {
    String? childId,
  }) async {
    if (_apiClient.isDemoSession) {
      DemoAccount.removeFromPlan(track, questId, childId: childId);
    }
  }

  Future<void> markVideoWatched({
    required int weekNumber,
    required String videoId,
    String? childId,
  }) async {
    if (_apiClient.isDemoSession) {
      TeenQuest? week;
      for (final item in DemoAccount.demoWeeks()) {
        if (item.weekNumber == weekNumber) week = item;
      }
      if (week == null) return;
      DemoAccount.markVideoWatched(questId: week.id, videoId: videoId, childId: childId);
      return;
    }
    try {
      await _apiClient.dio.post('/api/engagement/complete', data: {
        'activityType': 'VIDEO_WATCH',
        'refKey': videoId,
        if (childId != null && childId.isNotEmpty) 'childId': childId,
      });
    } on DioException {
      return;
    }
  }

  /// Ready for the prayer-declaration UI; awards 1 point until the client confirms.
  Future<void> markPrayerDeclared({
    required String refKey,
    String? childId,
  }) async {
    if (_apiClient.isDemoSession) return;
    try {
      await _apiClient.dio.post('/api/engagement/complete', data: {
        'activityType': 'PRAYER_DECLARATION',
        'refKey': refKey,
        if (childId != null && childId.isNotEmpty) 'childId': childId,
      });
    } on DioException {
      return;
    }
  }

  bool isVideoWatched(TeenQuest week, String videoId, {String? childId}) {
    if (_apiClient.isDemoSession) {
      return DemoAccount.isVideoWatched(
        questId: week.id,
        videoId: videoId,
        childId: childId,
      );
    }
    return false;
  }

  bool weekVideosComplete(TeenQuest week, {String? childId}) {
    if (_apiClient.isDemoSession) {
      return DemoAccount.weekVideosComplete(week, childId: childId);
    }
    return false;
  }
}
