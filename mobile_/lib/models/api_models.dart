import 'dart:convert';
import 'puzzle.dart';
import 'video_lesson.dart';

/// JSON numbers are `int` on VM and often `double` on web — never cast with `as int`.
int? _jsonInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

/// Platform roles
enum PlatformRole { MAIN_ACCOUNT, APP_MANAGER }

/// Age bands for children
enum AgeBand { CHILD, TEEN }

/// Activity types for Teen Quest scoring
enum ActivityType {
  TEEN_QUEST_OBJS,
  PUZZLE_SOLVE,
  VIDEO_WATCH,
  PRAYER_DECLARATION,
}

/// User model (parent or app manager)
class User {
  final String id;
  final String email;
  final String name;
  final PlatformRole platformRole;

  const User({
    required this.id,
    required this.email,
    required this.name,
    required this.platformRole,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      platformRole: _parseRole(json['role'] ?? json['platformRole']),
    );
  }

  static PlatformRole _parseRole(dynamic role) {
    if (role == 'APP_MANAGER') return PlatformRole.APP_MANAGER;
    return PlatformRole.MAIN_ACCOUNT;
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'name': name,
    'role': platformRole.name,
  };
}

/// Child model
class Child {
  final String id;
  final String familyId;
  final String name;
  final AgeBand ageBand;
  final bool independentLogin;

  const Child({
    required this.id,
    required this.familyId,
    required this.name,
    required this.ageBand,
    this.independentLogin = false,
  });

  factory Child.fromJson(Map<String, dynamic> json) {
    return Child(
      id: json['id'] as String,
      familyId: json['familyId'] as String? ?? '',
      name: json['name'] as String,
      ageBand: _parseAgeBand(json['ageBand']),
      independentLogin: json['independentLogin'] as bool? ?? false,
    );
  }

  static AgeBand _parseAgeBand(dynamic band) {
    if (band == 'TEEN') return AgeBand.TEEN;
    return AgeBand.CHILD;
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'familyId': familyId,
    'name': name,
    'ageBand': ageBand.name,
    'independentLogin': independentLogin,
  };
}

/// Score ledger entry
class ScoreLedgerEntry {
  final String id;
  final String childId;
  final String familyId;
  final ActivityType activityType;
  final String refKey;
  final int points;
  final DateTime? day;
  final int? totalPoints;

  const ScoreLedgerEntry({
    required this.id,
    required this.childId,
    required this.familyId,
    required this.activityType,
    required this.refKey,
    required this.points,
    this.day,
    this.totalPoints,
  });

  factory ScoreLedgerEntry.fromJson(Map<String, dynamic> json) {
    return ScoreLedgerEntry(
      id: json['id'] as String,
      childId: json['childId'] as String,
      familyId: json['familyId'] as String,
      activityType: _parseActivityType(json['activityType']),
      refKey: json['refKey'] as String,
      points: json['points'] as int,
      day: json['day'] != null ? _parseDate(json['day']) : null,
      totalPoints: json['totalPoints'] as int?,
    );
  }

  static ActivityType _parseActivityType(dynamic type) {
    return ActivityType.values.firstWhere(
      (e) => e.name == type,
      orElse: () => ActivityType.TEEN_QUEST_OBJS,
    );
  }

  static DateTime _parseDate(dynamic date) {
    if (date is String) return DateTime.parse(date);
    if (date is int) return DateTime.fromMillisecondsSinceEpoch(date);
    return DateTime.now();
  }
}

/// Streak model
class Streak {
  final String id;
  final String childId;
  final int current;
  final int longest;
  final DateTime? lastDay;

  const Streak({
    required this.id,
    required this.childId,
    required this.current,
    required this.longest,
    this.lastDay,
  });

  factory Streak.fromJson(Map<String, dynamic> json) {
    return Streak(
      id: json['id'] as String,
      childId: json['childId'] as String,
      current: json['current'] as int? ?? 0,
      longest: json['longest'] as int? ?? 0,
      lastDay: json['lastDay'] != null
          ? ScoreLedgerEntry._parseDate(json['lastDay'])
          : null,
    );
  }

  factory Streak.empty(String childId) => Streak(
    id: '',
    childId: childId,
    current: 0,
    longest: 0,
  );
}

/// Quiz question for Teen Quest
class TeenQuestQuizItem {
  final String id;
  /// Backend type name: `MULTIPLE_CHOICE` | `FILL_BLANK`.
  final String type;
  final String question;
  final List<String> options;
  final int answerIndex;
  final List<String> acceptedAnswers;
  final int points;

  TeenQuestQuizItem({
    required this.id,
    required this.question,
    required this.options,
    required this.answerIndex,
    required this.points,
    this.type = 'MULTIPLE_CHOICE',
    this.acceptedAnswers = const [],
  });

  factory TeenQuestQuizItem.fromJson(Map<String, dynamic> json) {
    final typeRaw = '${json['type'] ?? 'MULTIPLE_CHOICE'}';
    final type = typeRaw == 'FILL_BLANK' ? 'FILL_BLANK' : 'MULTIPLE_CHOICE';
    return TeenQuestQuizItem(
      id: json['id'] as String? ?? '',
      type: type,
      question: json['question'] as String? ?? '',
      options: [
        for (final option in (json['options'] as List? ?? const [])) '$option',
      ],
      // Web JSON numbers arrive as double; never use `as int` here.
      answerIndex: _jsonInt(json['answerIndex']) ?? 0,
      acceptedAnswers: [
        for (final answer in (json['acceptedAnswers'] as List? ?? const [])) '$answer',
      ],
      points: _jsonInt(json['points']) ?? 5,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'question': question,
    'options': options,
    'answerIndex': answerIndex,
    'acceptedAnswers': acceptedAnswers,
    'points': points,
  };

  QuizQuestion toQuizQuestion() => QuizQuestion(
    id: id,
    type: type == 'FILL_BLANK' ? QuizItemType.fillBlank : QuizItemType.multipleChoice,
    question: question,
    options: options,
    answerIndex: answerIndex,
    acceptedAnswers: acceptedAnswers,
    points: points,
  );
}

/// Where a week sits on a learner's plan.
enum CurriculumTrack { home, personal }

/// A verse or chapter assigned with a week.
class BiblePortion {
  final String id;
  final String reference;
  final String passage;
  final String text;

  const BiblePortion({
    required this.id,
    required this.reference,
    this.passage = '',
    this.text = '',
  });

  factory BiblePortion.fromJson(Map<String, dynamic> json) {
    return BiblePortion(
      id: json['id'] as String? ?? json['reference'] as String? ?? '',
      reference: json['reference'] as String? ?? '',
      passage: json['passage'] as String? ?? '',
      text: json['text'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'reference': reference,
        'passage': passage,
        'text': text,
      };
}

class LearningTrackView {
  final CurriculumTrack track;
  final String label;
  final List<TeenQuest> weeks;

  const LearningTrackView({
    required this.track,
    required this.label,
    required this.weeks,
  });
}

/// Playable studio game attached to a quest week.
enum QuestGameType { puzzle, matching }

/// Teen Quest week model
class TeenQuest {
  final String id;
  final int weekNumber;
  final String title;
  final String scripture;
  final String content;
  final String declarationText;
  final List<TeenQuestQuizItem> objectiveQuiz;
  final List<BiblePortion> biblePortions;
  final List<VideoLesson> videos;
  final QuestGameType gameType;
  final String? puzzleId;
  final String? matchingId;
  final DateTime? createdAt;

  const TeenQuest({
    required this.id,
    required this.weekNumber,
    required this.title,
    required this.scripture,
    required this.content,
    this.declarationText = '',
    required this.objectiveQuiz,
    this.biblePortions = const [],
    this.videos = const [],
    this.gameType = QuestGameType.puzzle,
    this.puzzleId,
    this.matchingId,
    this.createdAt,
  });

  bool get isMatchingGame =>
      gameType == QuestGameType.matching ||
      (matchingId != null && matchingId!.trim().isNotEmpty);

  String get gameStepTitle => isMatchingGame ? 'Match' : 'Puzzle';

  factory TeenQuest.fromJson(Map<String, dynamic> json) {
    final weekNumber = _jsonInt(json['weekNumber']) ?? 0;
    final objQuiz = json['objectiveQuiz'];
    final matchingId = json['matchingId'] as String?;
    final rawType = (json['gameType'] as String?)?.toUpperCase();
    final gameType = rawType == 'MATCHING' ||
            (matchingId != null && matchingId.trim().isNotEmpty)
        ? QuestGameType.matching
        : QuestGameType.puzzle;

    return TeenQuest(
      id: json['id'] as String? ?? '',
      weekNumber: weekNumber,
      title: json['title'] as String? ?? '',
      scripture: json['scripture'] as String? ?? '',
      content: json['content'] as String? ?? '',
      declarationText: (json['declarationText'] as String? ?? '').trim(),
      objectiveQuiz: _parseQuizItems(objQuiz),
      biblePortions: _parsePortions(json['biblePortions']),
      videos: _parseVideos(json['videos'], weekNumber: weekNumber),
      gameType: gameType,
      puzzleId: json['puzzleId'] as String?,
      matchingId: matchingId,
      createdAt: json['createdAt'] != null
          ? ScoreLedgerEntry._parseDate(json['createdAt'])
          : null,
    );
  }

  static List<TeenQuestQuizItem> _parseQuizItems(dynamic data) {
    if (data == null) return [];
    List<dynamic> raw;
    if (data is List) {
      raw = data;
    } else if (data is String) {
      try {
        raw = jsonDecode(data) as List;
      } catch (_) {
        return [];
      }
    } else {
      return [];
    }
    return [
      for (final item in raw)
        if (item is Map)
          TeenQuestQuizItem.fromJson(Map<String, dynamic>.from(item)),
    ];
  }

  static List<VideoLesson> _parseVideos(dynamic data, {int weekNumber = 0}) {
    List<dynamic> raw;
    if (data is List) {
      raw = data;
    } else if (data is String) {
      try {
        raw = jsonDecode(data) as List;
      } catch (_) {
        return const [];
      }
    } else {
      return const [];
    }
    return raw
        .whereType<Map>()
        .map((e) => VideoLesson.fromJson(Map<String, dynamic>.from(e), weekNumber: weekNumber))
        .toList();
  }

  static List<BiblePortion> _parsePortions(dynamic data) {
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((e) => BiblePortion.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Map<String, dynamic> toSummaryJson() => {
    'id': id,
    'weekNumber': weekNumber,
    'title': title,
    'scripture': scripture,
    'content': content,
    'declarationText': declarationText,
    'createdAt': createdAt?.toIso8601String(),
  };

  Map<String, dynamic> toJson() => {
        'id': id,
        'weekNumber': weekNumber,
        'title': title,
        'scripture': scripture,
        'content': content,
        'declarationText': declarationText,
        'objectiveQuiz': objectiveQuiz.map((item) => item.toJson()).toList(),
        'biblePortions': biblePortions.map((portion) => portion.toJson()).toList(),
        'videos': videos.map((video) => video.toJson()).toList(),
        'gameType': gameType == QuestGameType.matching ? 'MATCHING' : 'PUZZLE',
        'puzzleId': puzzleId,
        'matchingId': matchingId,
        'createdAt': createdAt?.toIso8601String(),
      };
}

/// Finished activities for one week from `GET /api/teen-quest/weeks/:n/progress`.
class WeekActivityProgress {
  const WeekActivityProgress({
    required this.weekNumber,
    required this.watchedVideoIds,
    required this.quizDone,
    required this.puzzleDone,
    required this.tracked,
  });

  final int weekNumber;
  final List<String> watchedVideoIds;
  final bool quizDone;
  final bool puzzleDone;
  final bool tracked;

  factory WeekActivityProgress.fromJson(Map<String, dynamic> json) {
    final progress = Map<String, dynamic>.from(json['progress'] as Map? ?? const {});
    return WeekActivityProgress(
      weekNumber: _jsonInt(json['weekNumber']) ?? 0,
      watchedVideoIds: [
        for (final id in (progress['watchedVideoIds'] as List? ?? const [])) id.toString(),
      ],
      quizDone: progress['quizDone'] == true,
      puzzleDone: progress['puzzleDone'] == true,
      tracked: json['tracked'] == true,
    );
  }
}

/// The explorer's self-paced week from `GET /api/teen-quest/current`.
class CurrentQuest {
  const CurrentQuest({
    required this.quest,
    required this.weekNumber,
    required this.totalWeeks,
    required this.weeksCompleted,
    required this.caughtUp,
    required this.tracked,
    required this.watchedVideoIds,
    required this.quizDone,
    required this.puzzleDone,
    this.videoPoints = 0,
    this.quizPoints = 0,
    this.puzzlePoints = 0,
    this.prayerPoints = 0,
    this.awaitingNextWeek = false,
    this.nextWeekOpensAt,
  });

  final TeenQuest quest;
  final int weekNumber;
  final int totalWeeks;
  final int weeksCompleted;
  /// Every published week finished.
  final bool caughtUp;
  /// False when the signed-in account has no explorer profile to record progress on.
  final bool tracked;
  final List<String> watchedVideoIds;
  final bool quizDone;
  final bool puzzleDone;
  /// Admin points for one finished video (`VIDEO_WATCH`).
  final int videoPoints;
  final int quizPoints;
  final int puzzlePoints;
  final int prayerPoints;
  /// Home default is held on a finished week until next Sunday 00:00.
  final bool awaitingNextWeek;
  /// When the home default may advance (ISO from API).
  final DateTime? nextWeekOpensAt;

  /// Week title without the "Week N:" prefix, e.g. "Genesis 1–8".
  String get passage => quest.title.replaceFirst(RegExp(r'^Week\s*\d+\s*[:\-–]\s*'), '');

  static Map<String, int> _activityPoints(Map<String, dynamic> json) {
    final raw = json['activityPoints'];
    if (raw is! Map) return const {};
    return {
      for (final e in raw.entries)
        if (e.key is String && e.value is num) e.key as String: (e.value as num).toInt(),
    };
  }

  factory CurrentQuest.fromJson(Map<String, dynamic> json) {
    final progress = Map<String, dynamic>.from(json['progress'] as Map? ?? const {});
    final questRaw = json['quest'];
    if (questRaw is! Map) {
      throw const FormatException('Current quest is missing week content');
    }
    final points = _activityPoints(json);
    DateTime? opensAt;
    final rawOpens = json['nextWeekOpensAt'];
    if (rawOpens is String && rawOpens.isNotEmpty) {
      opensAt = DateTime.tryParse(rawOpens)?.toUtc();
    }
    return CurrentQuest(
      quest: TeenQuest.fromJson(Map<String, dynamic>.from(questRaw)),
      weekNumber: _jsonInt(json['weekNumber']) ?? 0,
      totalWeeks: _jsonInt(json['totalWeeks']) ?? 0,
      weeksCompleted: _jsonInt(json['weeksCompleted']) ?? 0,
      caughtUp: json['caughtUp'] == true,
      tracked: json['tracked'] == true,
      watchedVideoIds: [
        for (final id in (progress['watchedVideoIds'] as List? ?? const [])) id.toString(),
      ],
      quizDone: progress['quizDone'] == true,
      puzzleDone: progress['puzzleDone'] == true,
      videoPoints: points['VIDEO_WATCH'] ?? 0,
      quizPoints: points['TEEN_QUEST_OBJS'] ?? 0,
      puzzlePoints: points['PUZZLE_SOLVE'] ?? 0,
      prayerPoints: points['PRAYER_DECLARATION'] ?? 0,
      awaitingNextWeek: json['awaitingNextWeek'] == true,
      nextWeekOpensAt: opensAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'weekNumber': weekNumber,
        'totalWeeks': totalWeeks,
        'weeksCompleted': weeksCompleted,
        'caughtUp': caughtUp,
        'tracked': tracked,
        'awaitingNextWeek': awaitingNextWeek,
        if (nextWeekOpensAt != null) 'nextWeekOpensAt': nextWeekOpensAt!.toIso8601String(),
        'quest': quest.toJson(),
        'progress': {
          'watchedVideoIds': watchedVideoIds,
          'quizDone': quizDone,
          'puzzleDone': puzzleDone,
        },
        'activityPoints': {
          'VIDEO_WATCH': videoPoints,
          'TEEN_QUEST_OBJS': quizPoints,
          'PUZZLE_SOLVE': puzzlePoints,
          'PRAYER_DECLARATION': prayerPoints,
        },
      };

  /// Merges activity flags when the server week matches. Server owns home-default
  /// week number, Sunday hold, and cross-device completion (no local timer).
  static CurrentQuest preferLocalProgress(CurrentQuest? local, CurrentQuest remote) {
    if (local == null) return remote;
    // Different week or Sunday hold → always trust the DB-backed API.
    if (remote.weekNumber != local.weekNumber || remote.awaitingNextWeek) {
      return remote;
    }
    final watched = <String>{
      ...local.watchedVideoIds,
      ...remote.watchedVideoIds,
    }.toList();
    return CurrentQuest(
      quest: remote.quest,
      weekNumber: remote.weekNumber,
      totalWeeks: remote.totalWeeks,
      weeksCompleted: remote.weeksCompleted >= local.weeksCompleted
          ? remote.weeksCompleted
          : local.weeksCompleted,
      caughtUp: remote.caughtUp || local.caughtUp,
      tracked: remote.tracked,
      watchedVideoIds: watched,
      quizDone: local.quizDone || remote.quizDone,
      puzzleDone: local.puzzleDone || remote.puzzleDone,
      videoPoints: remote.videoPoints > 0 ? remote.videoPoints : local.videoPoints,
      quizPoints: remote.quizPoints > 0 ? remote.quizPoints : local.quizPoints,
      puzzlePoints: remote.puzzlePoints > 0 ? remote.puzzlePoints : local.puzzlePoints,
      prayerPoints: remote.prayerPoints > 0 ? remote.prayerPoints : local.prayerPoints,
      awaitingNextWeek: remote.awaitingNextWeek,
      nextWeekOpensAt: remote.nextWeekOpensAt ?? local.nextWeekOpensAt,
    );
  }

  CurrentQuest withStep(String step) {
    return CurrentQuest(
      quest: quest,
      weekNumber: weekNumber,
      totalWeeks: totalWeeks,
      weeksCompleted: weeksCompleted,
      caughtUp: caughtUp,
      tracked: tracked,
      watchedVideoIds: watchedVideoIds,
      quizDone: step == 'QUIZ' ? true : quizDone,
      puzzleDone: step == 'PUZZLE' ? true : puzzleDone,
      videoPoints: videoPoints,
      quizPoints: quizPoints,
      puzzlePoints: puzzlePoints,
      prayerPoints: prayerPoints,
      awaitingNextWeek: awaitingNextWeek,
      nextWeekOpensAt: nextWeekOpensAt,
    );
  }

  CurrentQuest withActivityPoints({
    int? videoPoints,
    int? quizPoints,
    int? puzzlePoints,
    int? prayerPoints,
  }) {
    return CurrentQuest(
      quest: quest,
      weekNumber: weekNumber,
      totalWeeks: totalWeeks,
      weeksCompleted: weeksCompleted,
      caughtUp: caughtUp,
      tracked: tracked,
      watchedVideoIds: watchedVideoIds,
      quizDone: quizDone,
      puzzleDone: puzzleDone,
      videoPoints: videoPoints ?? this.videoPoints,
      quizPoints: quizPoints ?? this.quizPoints,
      puzzlePoints: puzzlePoints ?? this.puzzlePoints,
      prayerPoints: prayerPoints ?? this.prayerPoints,
      awaitingNextWeek: awaitingNextWeek,
      nextWeekOpensAt: nextWeekOpensAt,
    );
  }
}

/// Family points Entry model
class FamilyJarEntry {
  final String id;
  final String familyId;
  final String label;
  final int points;
  final DateTime createdAt;

  const FamilyJarEntry({
    required this.id,
    required this.familyId,
    required this.label,
    required this.points,
    required this.createdAt,
  });

  factory FamilyJarEntry.fromJson(Map<String, dynamic> json) {
    return FamilyJarEntry(
      id: json['id'] as String,
      familyId: json['familyId'] as String,
      label: json['label'] as String,
      points: json['points'] as int,
      createdAt: _parseDate(json['createdAt']),
    );
  }

  static DateTime _parseDate(dynamic date) {
    if (date is String) return DateTime.parse(date);
    if (date is int) return DateTime.fromMillisecondsSinceEpoch(date);
    return DateTime.now();
  }
}

/// Leaderboard entry
class LeaderboardEntry {
  final int rank;
  final String? childId;
  final String childName;
  final int points;
  final bool isMine;
  final bool isBlurred;

  const LeaderboardEntry({
    required this.rank,
    this.childId,
    required this.childName,
    required this.points,
    required this.isMine,
    required this.isBlurred,
  });

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      rank: json['rank'] as int? ?? 0,
      childId: json['childId'] as String?,
      childName: json['childName'] as String? ?? 'Participant',
      points: (json['points'] as num?)?.toInt() ?? 0,
      isMine: json['isMine'] as bool? ?? false,
      isBlurred: json['isBlurred'] as bool? ?? false,
    );
  }
}

/// One family, church or class group with its ranked standings.
class GroupDetail {
  final String id;
  final String kind;
  final String name;
  final String? description;
  final String? creatorName;
  final String? creatorEmail;
  final int memberCount;
  final int points;
  final List<LeaderboardEntry> standings;
  final bool pointsHidden;

  const GroupDetail({
    required this.id,
    required this.kind,
    this.name = '',
    this.description,
    this.creatorName,
    this.creatorEmail,
    this.memberCount = 0,
    this.points = 0,
    this.standings = const [],
    this.pointsHidden = false,
  });

  factory GroupDetail.fromJson(Map<String, dynamic> json) {
    return GroupDetail(
      id: json['id'] as String? ?? '',
      kind: json['kind'] as String? ?? 'CLASS',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      creatorName: json['creatorName'] as String?,
      creatorEmail: json['creatorEmail'] as String?,
      memberCount: (json['memberCount'] as num?)?.toInt() ?? 0,
      points: (json['points'] as num?)?.toInt() ?? 0,
      pointsHidden: json['pointsHidden'] == true,
      standings: (json['standings'] as List? ?? [])
          .map((e) => LeaderboardEntry.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
    );
  }

  /// Fields the group screens read from a membership row, filled from the server.
  Map<String, dynamic> mergeInto(Map<String, dynamic>? membership) {
    return {
      ...?membership,
      if (description != null) 'description': description,
      if (creatorName != null) 'creatorName': creatorName,
      if (creatorEmail != null) 'creatorEmail': creatorEmail,
      'memberCount': memberCount,
      'points': pointsHidden ? null : points,
      'pointsHidden': pointsHidden,
    };
  }
}

/// One admin-approved cheer template for the picker (send by id only).
class NudgeTemplate {
  final String id;
  final String key;
  final String message;

  const NudgeTemplate({
    required this.id,
    required this.key,
    required this.message,
  });

  factory NudgeTemplate.fromJson(Map<String, dynamic> json) {
    return NudgeTemplate(
      id: json['id'] as String? ?? '',
      key: json['key'] as String? ?? '',
      message: json['message'] as String? ?? '',
    );
  }
}

/// Nudge model
class Nudge {
  final String id;
  final String stickerKey;
  final String? message;
  final DateTime createdAt;
  final DateTime? readAt;
  final String? fromName;
  final String? groupName;
  final String? classId;

  const Nudge({
    required this.id,
    required this.stickerKey,
    required this.createdAt,
    this.message,
    this.readAt,
    this.fromName,
    this.groupName,
    this.classId,
  });

  /// "Ada · Youth Circle" or fallback "Encouragement".
  String get sourceLabel {
    final from = fromName?.trim() ?? '';
    final group = groupName?.trim() ?? '';
    if (from.isNotEmpty && group.isNotEmpty) return '$from · $group';
    if (from.isNotEmpty) return from;
    if (group.isNotEmpty) return group;
    return 'Encouragement';
  }

  factory Nudge.fromJson(Map<String, dynamic> json) {
    return Nudge(
      id: json['id'] as String,
      stickerKey: json['stickerKey'] as String,
      message: json['message'] as String?,
      createdAt: ScoreLedgerEntry._parseDate(json['createdAt']),
      readAt: json['readAt'] != null
          ? ScoreLedgerEntry._parseDate(json['readAt'])
          : null,
      fromName: json['fromName'] as String?,
      groupName: json['groupName'] as String?,
      classId: json['classId'] as String?,
    );
  }

  Nudge markedRead([DateTime? at]) => Nudge(
        id: id,
        stickerKey: stickerKey,
        message: message,
        createdAt: createdAt,
        readAt: readAt ?? at ?? DateTime.now(),
        fromName: fromName,
        groupName: groupName,
        classId: classId,
      );
}

/// Class Quiz Activation
class ClassQuizActivation {
  final String id;
  final String classId;
  final String questId;
  final String quizType;
  final bool isActive;
  final String activatedByUserId;
  final DateTime activatedAt;

  const ClassQuizActivation({
    required this.id,
    required this.classId,
    required this.questId,
    required this.quizType,
    required this.isActive,
    required this.activatedByUserId,
    required this.activatedAt,
  });

  factory ClassQuizActivation.fromJson(Map<String, dynamic> json) {
    return ClassQuizActivation(
      id: json['id'] as String,
      classId: json['classId'] as String,
      questId: json['questId'] as String,
      quizType: json['quizType'] as String? ?? 'OBJS',
      isActive: json['isActive'] as bool? ?? true,
      activatedByUserId: json['activatedByUserId'] as String,
      activatedAt: ScoreLedgerEntry._parseDate(json['activatedAt']),
    );
  }
}

/// Quiz submission result
class QuizSubmissionResult {
  final int totalPoints;
  final List<QuizItemResult> itemResults;

  const QuizSubmissionResult({
    required this.totalPoints,
    required this.itemResults,
  });

  factory QuizSubmissionResult.fromJson(Map<String, dynamic> json) {
    return QuizSubmissionResult(
      totalPoints: json['totalPoints'] as int,
      itemResults: (json['itemResults'] as List)
          .map((e) => QuizItemResult.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class QuizItemResult {
  final String id;
  final bool isCorrect;
  final int pointsAwarded;

  const QuizItemResult({
    required this.id,
    required this.isCorrect,
    required this.pointsAwarded,
  });

  factory QuizItemResult.fromJson(Map<String, dynamic> json) {
    return QuizItemResult(
      id: json['id'] as String,
      isCorrect: json['isCorrect'] as bool,
      pointsAwarded: json['pointsAwarded'] as int,
    );
  }
}

/// Auth response
class AuthResponse {
  final String token;
  final User? user;
  final Child? child;

  const AuthResponse({
    required this.token,
    this.user,
    this.child,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      token: json['token'] as String,
      user: json['user'] != null ? User.fromJson(json['user']) : null,
      child: json['child'] != null ? Child.fromJson(json['child']) : null,
    );
  }
}

