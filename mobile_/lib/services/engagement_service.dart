import 'package:dio/dio.dart';
import '../models/api_models.dart';
import '../quest_milestones.dart';
import 'api_client.dart';

/// Engagement Service for scores, streaks, nudges, and leaderboards.
class EngagementService {
  final ApiClient _apiClient;

  EngagementService(this._apiClient);


  /// Get ASK Score for a child
  Future<AskScore> getAskScore(String childId) async {
    try {
      final response = await _apiClient.dio.get('/api/engagement/score/$childId');
      return AskScore.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Get family summary (parent view)
  Future<FamilySummary> getFamilySummary() async {
    try {
      final response = await _apiClient.dio.get('/api/engagement/family');
      return FamilySummary.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Group points aggregate only — no family names or amounts.
  Future<GroupJar> getGroupJar() async {
    try {
      final response = await _apiClient.dio.get('/api/engagement/group-jar');
      return GroupJar.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Admin-approved cheer templates (pick by id only — no freeform text).
  Future<List<NudgeTemplate>> getNudgeTemplates({String? classId}) async {
    try {
      final response = await _apiClient.dio.get(
        '/api/engagement/nudge-templates',
        queryParameters: {
          if (classId != null && classId.isNotEmpty) 'classId': classId,
        },
      );
      return (response.data as List)
          .map((e) => NudgeTemplate.fromJson(Map<String, dynamic>.from(e as Map)))
          .where((t) => t.id.isNotEmpty && t.message.isNotEmpty)
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Send nudge to child (FCM push when they have a registered device).
  Future<Nudge> sendNudge({
    required String childId,
    required String templateId,
    String? classId,
  }) async {
    try {
      final response = await _apiClient.dio.post('/api/engagement/nudge', data: {
        'childId': childId,
        'templateId': templateId,
        if (classId != null && classId.isNotEmpty) 'classId': classId,
      });
      return Nudge.fromJson(response.data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Cheer every approved member of a class/custom group (owner or teacher).
  Future<int> sendGroupNudge({
    required String classId,
    required String templateId,
  }) async {
    try {
      final response = await _apiClient.dio.post('/api/engagement/nudge-group', data: {
        'classId': classId,
        'templateId': templateId,
      });
      final data = Map<String, dynamic>.from(response.data as Map);
      return (data['count'] as num?)?.toInt() ?? 0;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Get nudges for current child
  Future<List<Nudge>> getNudges() async {
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
    try {
      await _apiClient.dio.post(
        '/api/engagement/nudges/read',
        data: <String, dynamic>{},
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Delete every encouragement in this explorer's inbox.
  Future<void> clearNudges() async {
    try {
      await _apiClient.dio.delete('/api/engagement/nudges');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> deleteNudge(String id) async {
    try {
      await _apiClient.dio.delete('/api/engagement/nudges/$id');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Teacher notes for the classes this explorer (or this parent's explorers) belong to.
  Future<List<ClassInboxMessage>> getClassMessages() async {
    try {
      final response = await _apiClient.dio.get('/api/engagement/class-messages');
      return (response.data as List)
          .map((e) => ClassInboxMessage.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> markClassMessagesRead() async {
    try {
      await _apiClient.dio.post(
        '/api/engagement/class-messages/read',
        data: <String, dynamic>{},
      );
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

  /// Week, month, or year bars for the signed-in explorer.
  /// The server reads a fixed set of day or month keys.
  Future<ActivitySeries> getActivityStats(String range) async {
    try {
      final response = await _apiClient.dio.get(
        '/api/auth/me/stats',
        queryParameters: {'range': range},
      );
      return ActivitySeries.fromJson(Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Points, streak, weeks completed, recent activity and group ranks for the
  /// signed-in explorer, plus every explorer an adult looks after.
  Future<Achievements> getAchievements() async {
    try {
      final response = await _apiClient.dio.get('/api/engagement/achievements');
      return Achievements.fromJson(Map<String, dynamic>.from(response.data as Map));
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}

/// One Week, Month, or Year chart from the signed-in explorer's awards.
class ActivitySeries {
  final String range;
  final List<String> labels;
  final List<int> points;
  final int total;

  const ActivitySeries({
    required this.range,
    required this.labels,
    required this.points,
    required this.total,
  });

  factory ActivitySeries.fromJson(Map<String, dynamic> json) {
    final buckets = (json['buckets'] as List?) ?? const [];
    final labels = <String>[];
    final points = <int>[];
    for (final raw in buckets) {
      final bucket = Map<String, dynamic>.from(raw as Map);
      labels.add(bucket['label'] as String? ?? '');
      points.add((bucket['points'] as num?)?.toInt() ?? 0);
    }
    return ActivitySeries(
      range: json['range'] as String? ?? 'month',
      labels: labels,
      points: points,
      total: (json['total'] as num?)?.toInt() ?? points.fold<int>(0, (sum, n) => sum + n),
    );
  }

  /// Axis with no awards. Used for the offline demo, which has no ledger.
  factory ActivitySeries.empty(String range) {
    final now = DateTime.now().toUtc();
    final today = DateTime.utc(now.year, now.month, now.day);
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (range == 'week') {
      return ActivitySeries(
        range: range,
        labels: [
          for (var i = 6; i >= 0; i--) weekdays[today.subtract(Duration(days: i)).weekday % 7],
        ],
        points: List.filled(7, 0),
        total: 0,
      );
    }
    if (range == 'year') {
      return ActivitySeries(
        range: range,
        labels: [
          for (var i = 11; i >= 0; i--) months[DateTime.utc(today.year, today.month - i, 1).month - 1],
        ],
        points: List.filled(12, 0),
        total: 0,
      );
    }
    return ActivitySeries(
      range: range,
      labels: const ['wk 1', 'wk 2', 'wk 3', 'wk 4', 'wk 5'],
      points: List.filled(5, 0),
      total: 0,
    );
  }
}

/// An explorer's rank inside one group they belong to.
class GroupPlace {
  final String kind;
  final String id;
  final String name;
  final int rank;
  final int points;
  final int memberCount;

  const GroupPlace({
    required this.kind,
    required this.id,
    required this.name,
    required this.rank,
    required this.points,
    this.memberCount = 0,
  });

  factory GroupPlace.fromJson(Map<String, dynamic> json) {
    return GroupPlace(
      kind: json['kind'] as String? ?? 'CLASS',
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      rank: (json['rank'] as num?)?.toInt() ?? 0,
      points: (json['points'] as num?)?.toInt() ?? 0,
      memberCount: (json['memberCount'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Achievement record for the signed-in explorer (`childId` null) or one explorer.
class AchievementRecord {
  final String? childId;
  final String name;
  final int points;
  final int streak;
  final int longestStreak;
  final int weeksCompleted;
  final int totalWeeks;
  final List<FamilyActivity> recent;
  final List<GroupPlace> groups;

  const AchievementRecord({
    this.childId,
    this.name = '',
    this.points = 0,
    this.streak = 0,
    this.longestStreak = 0,
    this.weeksCompleted = 0,
    this.totalWeeks = 0,
    this.recent = const [],
    this.groups = const [],
  });

  String get firstName => name.trim().split(' ').first;

  factory AchievementRecord.fromJson(Map<String, dynamic> json) {
    return AchievementRecord(
      childId: json['childId'] as String?,
      name: json['name'] as String? ?? '',
      points: (json['points'] as num?)?.toInt() ?? 0,
      streak: (json['streak'] as num?)?.toInt() ?? 0,
      longestStreak: (json['longestStreak'] as num?)?.toInt() ?? 0,
      weeksCompleted: (json['weeksCompleted'] as num?)?.toInt() ?? 0,
      totalWeeks: (json['totalWeeks'] as num?)?.toInt() ?? 0,
      recent: (json['recent'] as List? ?? [])
          .map((e) => FamilyActivity.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      groups: (json['groups'] as List? ?? [])
          .map((e) => GroupPlace.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
    );
  }
}

class Achievements {
  final AchievementRecord self;
  /// False when the signed-in adult has no explorer progress of their own.
  final bool tracked;
  final List<AchievementRecord> explorers;
  final int familyPoints;
  final List<QuestMilestone> awards;

  const Achievements({
    required this.self,
    required this.tracked,
    this.explorers = const [],
    this.familyPoints = 0,
    this.awards = knownQuestMilestones,
  });

  factory Achievements.fromJson(Map<String, dynamic> json) {
    final self = Map<String, dynamic>.from(json['self'] as Map? ?? const {});
    return Achievements(
      self: AchievementRecord.fromJson(self),
      tracked: self['tracked'] as bool? ?? false,
      explorers: (json['explorers'] as List? ?? [])
          .map((e) => AchievementRecord.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      familyPoints: (json['familyPoints'] as num?)?.toInt() ?? 0,
      awards: _awardsFromJson(json['awards']),
    );
  }

  static List<QuestMilestone> _awardsFromJson(Object? raw) {
    if (raw is! List || raw.isEmpty) return knownQuestMilestones;
    final awards = <QuestMilestone>[];
    for (final item in raw) {
      if (item is! Map) continue;
      final title = item['title'] as String? ?? '';
      final week = (item['weekNumber'] as num?)?.toInt() ?? 0;
      if (title.trim().isEmpty || week < 1) continue;
      awards.add(QuestMilestone(
        title: title.trim(),
        criteria: item['criteria'] as String? ?? '',
        weekComplete: week,
      ));
    }
    if (awards.isEmpty) return knownQuestMilestones;
    awards.sort((a, b) => a.weekComplete.compareTo(b.weekComplete));
    return awards;
  }
}

/// A teacher's note in the class inbox.
class ClassInboxMessage {
  final String id;
  final String classId;
  final String className;
  final String fromName;
  final String body;
  final DateTime createdAt;
  final bool unread;

  const ClassInboxMessage({
    required this.id,
    required this.classId,
    required this.className,
    required this.fromName,
    required this.body,
    required this.createdAt,
    required this.unread,
  });

  ClassInboxMessage markedRead() => ClassInboxMessage(
        id: id,
        classId: classId,
        className: className,
        fromName: fromName,
        body: body,
        createdAt: createdAt,
        unread: false,
      );

  factory ClassInboxMessage.fromJson(Map<String, dynamic> json) {
    return ClassInboxMessage(
      id: json['id'] as String? ?? '',
      classId: json['classId'] as String? ?? '',
      className: json['className'] as String? ?? 'Class',
      fromName: json['fromName'] as String? ?? 'Teacher',
      body: json['body'] as String? ?? '',
      createdAt: DateTime.tryParse('${json['createdAt']}') ?? DateTime.now(),
      unread: json['unread'] as bool? ?? false,
    );
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
