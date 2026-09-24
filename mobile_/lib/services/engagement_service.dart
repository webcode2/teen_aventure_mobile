import 'package:dio/dio.dart';
import '../config/demo_account.dart';
import '../models/api_models.dart';
import 'api_client.dart';

/// Engagement Service for scores, streaks, nudges, and leaderboards.
class EngagementService {
  final ApiClient _apiClient;

  EngagementService(this._apiClient);

  bool get _demo => _apiClient.isDemoSession;

  /// Get ASK Score for a child
  Future<AskScore> getAskScore(String childId) async {
    if (_demo) return const AskScore(askScore: 18, streak: 3, longestStreak: 5);
    try {
      final response = await _apiClient.dio.get('/api/engagement/score/$childId');
      return AskScore.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Get family summary (parent view)
  Future<FamilySummary> getFamilySummary() async {
    if (_demo) {
      return FamilySummary(
        familyAskScore: 42,
        familyJar: 42,
        children: const [
          FamilyChildScore(childId: DemoAccount.samId, name: 'Johnson Peterson', askScore: 18, streak: 3),
          FamilyChildScore(childId: DemoAccount.childId, name: 'Alex Peterson', askScore: 24, streak: 2),
        ],
        recent: [
          FamilyActivity(
            id: 'demo-act-sam',
            childId: DemoAccount.samId,
            childName: 'Johnson Peterson',
            activityType: 'TEEN_QUEST_OBJS',
            refKey: DemoAccount.demoQuestId,
            points: 18,
            createdAt: DateTime.now().subtract(const Duration(hours: 2)),
          ),
          FamilyActivity(
            id: 'demo-act-grace',
            childId: DemoAccount.childId,
            childName: 'Alex Peterson',
            activityType: 'VIDEO_WATCH',
            refKey: 'week-1-video-1',
            points: 24,
            createdAt: DateTime.now().subtract(const Duration(days: 1)),
          ),
        ],
      );
    }
    try {
      final response = await _apiClient.dio.get('/api/engagement/family');
      return FamilySummary.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Group points aggregate only — no family names or amounts.
  Future<GroupJar> getGroupJar() async {
    if (_demo) return const GroupJar(groupJarTotal: 40, contributingFamilies: 2);
    try {
      final response = await _apiClient.dio.get('/api/engagement/group-jar');
      return GroupJar.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Send nudge to child
  Future<Nudge> sendNudge({
    required String childId,
    required String stickerKey,
  }) async {
    if (_demo) return DemoAccount.addDemoNudge(stickerKey);
    try {
      final response = await _apiClient.dio.post('/api/engagement/nudge', data: {
        'childId': childId,
        'stickerKey': stickerKey,
      });
      return Nudge.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Get nudges for current child
  Future<List<Nudge>> getNudges() async {
    if (_demo) return DemoAccount.demoNudges();
    try {
      final response = await _apiClient.dio.get('/api/engagement/nudges');
      return (response.data as List)
          .map((e) => Nudge.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Mark the child's inbox as read
  Future<void> markNudgesRead() async {
    if (_demo) return;
    try {
      await _apiClient.dio.post('/api/engagement/nudges/read');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Get class leaderboard
  Future<List<LeaderboardEntry>> getClassLeaderboard(String classId) async {
    if (_demo) return DemoAccount.demoLeaderboard(_apiClient.getAuthToken(), classId: classId);
    try {
      final response = await _apiClient.dio.get('/api/engagement/leaderboard/$classId');
      return (response.data as List)
          .map((e) => LeaderboardEntry.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<({String className, LeaderboardEntry entry})>> familyGroupPlaces({
    required List<FamilyChildScore> children,
    required List<({String id, String name})> classes,
  }) async {
    if (_demo) return DemoAccount.demoFamilyGroupPositions();
    final ids = {for (final child in children) child.childId};
    final names = {for (final child in children) child.name.trim().split(' ').first};
    final found = <({String className, LeaderboardEntry entry})>[];
    for (final cls in classes) {
      try {
        final rows = await getClassLeaderboard(cls.id);
        for (final row in rows) {
          final match = (row.childId != null && ids.contains(row.childId)) ||
              row.isMine ||
              names.contains(row.childName);
          if (match) found.add((className: cls.name, entry: row));
        }
      } catch (_) {}
    }
    return found;
  }
}

class GroupJar {
  final int groupJarTotal;
  final int contributingFamilies;

  const GroupJar({required this.groupJarTotal, required this.contributingFamilies});

  factory GroupJar.fromJson(Map<String, dynamic> json) {
    return GroupJar(
      groupJarTotal: json['groupJarTotal'] as int? ?? 0,
      contributingFamilies: json['contributingFamilies'] as int? ?? 0,
    );
  }
}

/// ASK Score model
class AskScore {
  final int askScore;
  final int streak;
  final int longestStreak;

  const AskScore({
    required this.askScore,
    required this.streak,
    required this.longestStreak,
  });

  factory AskScore.fromJson(Map<String, dynamic> json) {
    return AskScore(
      askScore: json['askScore'] as int? ?? 0,
      streak: json['streak'] as int? ?? 0,
      longestStreak: json['longestStreak'] as int? ?? 0,
    );
  }
}

/// One child's ASK Score inside the family summary.
class FamilyChildScore {
  final String childId;
  final String name;
  final int askScore;
  final int streak;

  const FamilyChildScore({
    required this.childId,
    required this.name,
    required this.askScore,
    required this.streak,
  });

  factory FamilyChildScore.fromJson(Map<String, dynamic> json) {
    return FamilyChildScore(
      childId: json['childId'] as String? ?? json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      askScore: json['askScore'] as int? ?? 0,
      streak: json['streak'] as int? ?? 0,
    );
  }
}

/// Recent ledger contribution shown in the Family Points feed.
class FamilyActivity {
  final String id;
  final String childId;
  final String childName;
  final String activityType;
  final String refKey;
  final int points;
  final DateTime createdAt;

  const FamilyActivity({
    required this.id,
    required this.childId,
    required this.childName,
    required this.activityType,
    required this.refKey,
    required this.points,
    required this.createdAt,
  });

  factory FamilyActivity.fromJson(Map<String, dynamic> json) {
    return FamilyActivity(
      id: json['id'] as String,
      childId: json['childId'] as String,
      childName: json['childName'] as String? ?? '',
      activityType: json['activityType'] as String? ?? '',
      refKey: json['refKey'] as String? ?? '',
      points: json['points'] as int? ?? 0,
      createdAt: _parseDate(json['createdAt']),
    );
  }

  static DateTime _parseDate(dynamic date) {
    if (date is String) return DateTime.parse(date);
    if (date is int) return DateTime.fromMillisecondsSinceEpoch(date);
    return DateTime.now();
  }
}

/// Family Summary model
class FamilySummary {
  final int familyAskScore;
  final int familyJar;
  final List<FamilyChildScore> children;
  final List<Streak> streaks;
  final List<FamilyActivity> recent;

  const FamilySummary({
    required this.familyAskScore,
    required this.familyJar,
    this.children = const [],
    this.streaks = const [],
    this.recent = const [],
  });

  factory FamilySummary.fromJson(Map<String, dynamic> json) {
    return FamilySummary(
      familyAskScore: json['familyAskScore'] as int? ?? 0,
      familyJar: json['familyJar'] as int? ?? 0,
      children: (json['children'] as List? ?? [])
          .map((e) => FamilyChildScore.fromJson(e as Map<String, dynamic>))
          .toList(),
      streaks: (json['streaks'] as List? ?? [])
          .map((e) => Streak.fromJson(e as Map<String, dynamic>))
          .toList(),
      recent: (json['recent'] as List? ?? [])
          .map((e) => FamilyActivity.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
