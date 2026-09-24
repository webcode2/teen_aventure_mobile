import 'dart:convert';
import 'puzzle.dart';
import 'video_lesson.dart';

/// Platform roles
enum PlatformRole { MAIN_ACCOUNT, APP_MANAGER }

/// Age bands for children
enum AgeBand { CHILD, TEEN }

/// Activity types for Teen Quest scoring
enum ActivityType {
  TEEN_QUEST_OBJS,
  @Deprecated('Word scramble is permanently removed')
  TEEN_QUEST_SCRAMBLE,
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
  final String question;
  final List<String> options;
  final int answerIndex;
  final int points;

  TeenQuestQuizItem({
    required this.id,
    required this.question,
    required this.options,
    required this.answerIndex,
    required this.points,
  });

  factory TeenQuestQuizItem.fromJson(Map<String, dynamic> json) {
    return TeenQuestQuizItem(
      id: json['id'] as String,
      question: json['question'] as String,
      options: List<String>.from(json['options'] as List),
      answerIndex: json['answerIndex'] as int,
      points: json['points'] as int? ?? 5,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'question': question,
    'options': options,
    'answerIndex': answerIndex,
    'points': points,
  };

  QuizQuestion toQuizQuestion() => QuizQuestion(
    id: id,
    question: question,
    options: options,
    answerIndex: answerIndex,
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

/// Teen Quest week model
class TeenQuest {
  final String id;
  final int weekNumber;
  final String title;
  final String scripture;
  final String content;
  final List<TeenQuestQuizItem> objectiveQuiz;
  final List<BiblePortion> biblePortions;
  final List<VideoLesson> videos;
  final DateTime? createdAt;

  const TeenQuest({
    required this.id,
    required this.weekNumber,
    required this.title,
    required this.scripture,
    required this.content,
    required this.objectiveQuiz,
    this.biblePortions = const [],
    this.videos = const [],
    this.createdAt,
  });

  factory TeenQuest.fromJson(Map<String, dynamic> json) {
    final objQuiz = json['objectiveQuiz'];

    return TeenQuest(
      id: json['id'] as String,
      weekNumber: json['weekNumber'] as int,
      title: json['title'] as String,
      scripture: json['scripture'] as String? ?? '',
      content: json['content'] as String? ?? '',
      objectiveQuiz: _parseQuizItems(objQuiz),
      biblePortions: _parsePortions(json['biblePortions']),
      videos: _parseVideos(json['videos'], weekNumber: json['weekNumber'] as int? ?? 0),
      createdAt: json['createdAt'] != null
          ? ScoreLedgerEntry._parseDate(json['createdAt'])
          : null,
    );
  }

  static List<TeenQuestQuizItem> _parseQuizItems(dynamic data) {
    if (data == null) return [];
    if (data is List) {
      return data
          .map((e) => TeenQuestQuizItem.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is String) {
      try {
        final decoded = jsonDecode(data);
        return (decoded as List)
            .map((e) => TeenQuestQuizItem.fromJson(e as Map<String, dynamic>))
            .toList();
      } catch (_) {
        return [];
      }
    }
    return [];
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
    'createdAt': createdAt?.toIso8601String(),
  };
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
      points: json['points'] as int,
      isMine: json['isMine'] as bool? ?? false,
      isBlurred: json['isBlurred'] as bool? ?? false,
    );
  }
}

/// Nudge model
class Nudge {
  final String id;
  final String stickerKey;
  final DateTime createdAt;
  final DateTime? readAt;

  const Nudge({
    required this.id,
    required this.stickerKey,
    required this.createdAt,
    this.readAt,
  });

  factory Nudge.fromJson(Map<String, dynamic> json) {
    return Nudge(
      id: json['id'] as String,
      stickerKey: json['stickerKey'] as String,
      createdAt: ScoreLedgerEntry._parseDate(json['createdAt']),
      readAt: json['readAt'] != null
          ? ScoreLedgerEntry._parseDate(json['readAt'])
          : null,
    );
  }
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
      quizType: json['quizType'] as String? ?? 'BOTH',
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

