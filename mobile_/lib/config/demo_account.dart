import '../data/episodes.dart';
import '../join_payload.dart';
import '../models/api_models.dart';
import '../models/puzzle.dart';
import '../models/video_lesson.dart';
import '../services/api_client.dart';
import 'store_config.dart';

/// Local offline accounts for development and client testing.
class DemoAccount {
  static const tokenPrefix = 'demo-local';
  static const parentToken = '$tokenPrefix-parent';
  static const teenToken = '$tokenPrefix-teen';
  static const childToken = '$tokenPrefix-child';

  static const parentEmail = 'parent@askhub.local';
  static const parentPassword = 'demo1234';
  static const teenEmail = 'sam@askhub.local';
  static const teenPin = '1234';
  static const childId = 'demo-grace';
  static const childPin = '1234';

  static const parentId = 'demo-parent';
  static const familyId = 'demo-family';
  static const familyClassId = 'demo-family-class';
  static const classId = familyClassId;
  static const sundayTeensId = 'demo-sunday-teens';
  static const bibleQuizId = 'demo-bible-quiz';
  static const youthFellowshipId = 'demo-youth-fellowship';
  static const churchId = 'demo-grace-chapel';
  static const samId = 'demo-sam';

  static bool get enabled => StoreConfig.showDemoRoles;

  static bool isDemoToken(String? token) =>
      token != null && token.startsWith(tokenPrefix);

  static bool matchesParent(String email, String password) =>
      email.trim().toLowerCase() == parentEmail && password == parentPassword;

  static bool matchesTeen(String email, String pin) =>
      email.trim().toLowerCase() == teenEmail && pin == teenPin;

  static bool matchesChild(String id, String pin) =>
      pin == childPin && (id.trim() == childId || id.trim() == samId);

  static AuthResponse familyPinAuth(String childId) {
    return childId.trim() == samId ? teenAuth() : childAuth();
  }

  static const parentUser = User(
    id: parentId,
    email: parentEmail,
    name: 'Pat Peterson',
    platformRole: PlatformRole.MAIN_ACCOUNT,
  );

  static const teenChild = Child(
    id: samId,
    familyId: familyId,
    name: 'Johnson Peterson',
    ageBand: AgeBand.TEEN,
    independentLogin: true,
  );

  static const underAgeChild = Child(
    id: childId,
    familyId: familyId,
    name: 'Alex Peterson',
    ageBand: AgeBand.TEEN,

  );

  static AuthResponse parentAuth() => const AuthResponse(
        token: parentToken,
        user: parentUser,
      );

  static AuthResponse teenAuth() => const AuthResponse(
        token: teenToken,
        child: teenChild,
      );

  static AuthResponse childAuth() => const AuthResponse(
        token: childToken,
        child: underAgeChild,
      );

  static const childrenJson = [
    {
      'id': samId,
      'name': 'Johnson Peterson',
      'ageBand': 'TEEN',
      'email': teenEmail,
      'familyId': familyId,
    },
    {
      'id': childId,
      'name': 'Alex Peterson',
      'ageBand': 'TEEN',
      'familyId': familyId,
    },
  ];

  static const familyClassJson = [
    {'id': familyClassId, 'name': 'Home class', 'kind': 'FAMILY'},
  ];

  static const childClassJson = [
    {'id': familyClassId, 'name': 'Home class', 'kind': 'FAMILY'},
  ];

  static const teenClassJson = [
    {'id': familyClassId, 'name': 'Home class', 'kind': 'FAMILY'},
    {'id': sundayTeensId, 'name': 'Sunday Teens', 'kind': 'CHURCH'},
    {'id': bibleQuizId, 'name': 'Bible Quiz Club', 'kind': 'CHURCH'},
    {'id': youthFellowshipId, 'name': 'Youth Fellowship', 'kind': 'CHURCH'},
  ];

  static final Set<String> _leftMembershipIds = {};
  static final List<Map<String, dynamic>> _appReports = [];

  static void recordAppReport(Map<String, dynamic> report) {
    _appReports.add({
      ...report,
      'createdAt': DateTime.now().toIso8601String(),
    });
  }

  static List<Map<String, dynamic>> get demoAppReports => List.unmodifiable(_appReports);
  static bool _joinedChurch = false;
  static final List<Map<String, dynamic>> _extraFamilies = [];
  static final Set<String> _pendingDeletionIds = {};

  static Map<String, dynamic> createDemoFamily(String name) {
    final trimmed = name.trim();
    final id = 'demo-family-${_extraFamilies.length + 2}';
    _extraFamilies.add({
      'id': id,
      'kind': 'FAMILY',
      'name': trimmed,
      'role': 'Owner',
      'canLeave': false,
      'memberCount': 1,
      'canAdmin': true,
      'creatorName': 'Pat Peterson',
      'creatorEmail': parentEmail,
    });
    return {'id': id, 'name': trimmed};
  }

  static Map<String, dynamic> joinDemoChurch(String joinCode) {
    if (joinCode.trim().isEmpty) {
      throw ApiException(statusCode: 400, message: 'Enter a church join code');
    }
    _joinedChurch = true;
    return {'id': churchId, 'name': 'Grace Chapel'};
  }

  static Map<String, dynamic> deleteDemoGroup({required String kind, required String id}) {
    Map<String, dynamic>? found;
    for (final item in membershipsForToken(parentToken)['items'] as List) {
      final row = Map<String, dynamic>.from(item as Map);
      if (row['id'] == id && row['kind'] == kind) {
        found = row;
        break;
      }
    }
    found ??= () {
      for (final item in membershipsForToken(teenToken)['items'] as List) {
        final row = Map<String, dynamic>.from(item as Map);
        if (row['id'] == id && row['kind'] == kind) return row;
      }
      return null;
    }();
    final members = (found?['memberCount'] as num?)?.toInt() ?? 1;
    if (members <= 1) {
      leaveDemoMembership(kind: kind, id: id);
      _pendingDeletionIds.remove(id);
      return {'immediate': true};
    }
    _pendingDeletionIds.add(id);
    return {'pending': true};
  }

  static void leaveDemoMembership({required String kind, required String id}) {
    if (kind == 'FAMILY') {
      throw ApiException(statusCode: 403, message: 'You cannot leave a family group');
    }
    if (kind == 'CHURCH') {
      _joinedChurch = false;
      return;
    }
    _leftMembershipIds.add(id);
  }

  static Map<String, dynamic> membershipsForToken(String? token) {
    final items = <Map<String, dynamic>>[
      {
        'id': familyId,
        'kind': 'FAMILY',
        'name': 'Peterson Family',
        'role': token == parentToken ? 'Owner' : 'Home family',
        'canLeave': false,
        'memberCount': 3,
        'canAdmin': token == parentToken,
        'creatorName': 'Pat Peterson',
        'creatorEmail': parentEmail,
        'deletionPending': _pendingDeletionIds.contains(familyId),
      },
    ];
    if (token == teenToken) {
      for (final group in [
        (
          sundayTeensId,
          'Sunday Teens',
          12,
          240,
          'Weekly teen class for courage, scripture, and quests together.',
          'Pastor Ada',
          'Grace Chapel',
          'ada@gracechapel.local',
        ),
        (
          bibleQuizId,
          'Bible Quiz Club',
          8,
          180,
          'Friendly quiz nights that keep explorers sharp on the Word.',
          'Coach Micah',
          'Coach Micah',
          'micah@quizclub.local',
        ),
        (
          youthFellowshipId,
          'Youth Fellowship',
          15,
          96,
          'A hangout circle for prayer, games, and serving together.',
          'Sister Joy',
          'Youth Ministry',
          'joy@youth.local',
        ),
      ]) {
        if (_leftMembershipIds.contains(group.$1)) continue;
        items.add({
          'id': group.$1,
          'kind': 'CLASS',
          'name': group.$2,
          'role': 'Member',
          'canLeave': true,
          'memberCount': group.$3,
          'points': group.$4,
          'description': group.$5,
          'adminName': group.$6,
          'founderName': group.$7,
          'creatorName': group.$6,
          'creatorEmail': group.$8,
          'deletionPending': _pendingDeletionIds.contains(group.$1),
        });
      }
    }
    if ((token == parentToken || token == teenToken) && _joinedChurch) {
      items.add({
        'id': churchId,
        'kind': 'CHURCH',
        'name': 'Grace Chapel',
        'role': 'Church',
        'canLeave': token == parentToken,
        'memberCount': 18,
        'creatorName': 'Pastor Ada',
        'creatorEmail': 'ada@gracechapel.local',
        'deletionPending': _pendingDeletionIds.contains(churchId),
      });
    }
    for (final extra in _extraFamilies) {
      if (_leftMembershipIds.contains(extra['id'])) continue;
      items.add({
        ...extra,
        'deletionPending': _pendingDeletionIds.contains(extra['id']),
      });
    }
    final used = items.where((item) => item['kind'] != 'CHURCH').length;
    return {'used': used, 'max': maxMemberships, 'items': items};
  }

  static Map<String, dynamic> sessionForToken(String? token) {
    if (token == teenToken) {
      return {
        'type': 'child',
        'childId': samId,
        'familyId': familyId,
        'name': 'Johnson Peterson',
        'email': teenEmail,
        'ageBand': 'TEEN',
        'roles': ['CHILD'],
        'children': const [],
        'assignedClasses': teenClassJson,
      };
    }
    if (token == childToken) {
      return {
        'type': 'child',
        'childId': childId,
        'familyId': familyId,
        'name': 'Alex Peterson',
        'ageBand': 'TEEN',
        'roles': ['CHILD'],
        'children': const [],
        'assignedClasses': childClassJson,
      };
    }
    return {
      'type': 'user',
      'userId': parentId,
      'familyId': familyId,
      'name': 'Pat Peterson',
      'email': parentEmail,
      'roles': ['MAIN_ACCOUNT'],
      'children': childrenJson,
      'assignedClasses': familyClassJson,
    };
  }

  static Map<String, dynamic> familyJson() => {
        'id': familyId,
        'name': 'Peterson Family',
        'jurisdiction': 'NG',
        'children': childrenJson,
      };

  static const demoQuestId = 'demo-quest-1';
  static const demoQuestTwoId = 'demo-quest-2';
  static const demoQuestThreeId = 'demo-quest-3';

  static List<String> _familyPlan = [demoQuestId];
  static final Map<String, List<String>> _personalPlans = {};
  static final Set<String> _watchedKeys = {};

  static void resetCurriculum() {
    _familyPlan = [demoQuestId];
    _personalPlans.clear();
    _watchedKeys.clear();
  }

  static List<TeenQuest> demoWeeks() {
    final week1 = SampleEpisodes.week1Package;
    return [
      TeenQuest(
        id: demoQuestId,
        weekNumber: 1,
        title: 'Courage',
        scripture: 'Joshua 1:9',
        content: 'Be strong and courageous.',
        objectiveQuiz: _quizFrom(week1.quizQuestions),
        biblePortions: const [
          BiblePortion(
            id: 'bp1-1',
            reference: 'Joshua 1:9',
            passage: 'Joshua 1',
            text: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.',
          ),
          BiblePortion(
            id: 'bp1-2',
            reference: 'Judges 4:4',
            passage: 'Judges 4',
            text: 'Now Deborah, a prophetess, the wife of Lappidoth, was leading Israel at that time.',
          ),
          BiblePortion(
            id: 'bp1-3',
            reference: 'Judges 4:14',
            passage: 'Judges 4',
            text: 'Then Deborah said to Barak, "Go! This is the day the Lord has given Sisera into your hands."',
          ),
          BiblePortion(
            id: 'bp1-4',
            reference: 'Judges 5:24',
            passage: 'Judges 5',
            text: 'Most blessed of women be Jael, the wife of Heber the Kenite, most blessed of tent-dwelling women.',
          ),
          BiblePortion(
            id: 'bp1-5',
            reference: 'Psalm 27:1',
            passage: 'Psalm 27',
            text: 'The Lord is my light and my salvation—whom shall I fear?',
          ),
        ],
        videos: [
          ...week1.videos,
          const VideoLesson(
            id: 'w1_v4',
            weekNumber: 1,
            partNumber: 4,
            title: 'Part 4: Recap & Takeaway',
            subtitle: 'Stand firm in the courage God already gave you.',
            duration: '02:20',
            speaker: 'Abi & Zach',
            thumbnailEmoji: '🌟',
            keyVerse: 'Joshua 1:9',
            keyVerseText:
                'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.',
            takeaways: [
              'A king who tried to steal the last word',
              'A promise that still stands',
              'The courage nobody thought they had',
              'A river that stopped once before',
              'A woman who finished what the army started',
              'A song they will still be singing',
              'Stars that joined a battle',
              'A tent that changed the war',
              'A general who needed a partner',
              'The next step waiting for you',
            ],
            timestamps: [
              VideoTimestamp(time: '00:00', label: 'What we learned this week'),
              VideoTimestamp(time: '01:10', label: 'Your next step of courage'),
            ],
            quizQuestions: [],
          ),
        ],
      ),
      TeenQuest(
        id: demoQuestTwoId,
        weekNumber: 2,
        title: 'Kindness',
        scripture: 'Ephesians 4:32',
        content: 'Be kind to one another.',
        objectiveQuiz: _quizFrom(
          SampleEpisodes.weeklyVideoLessons
              .where((v) => v.weekNumber == 2)
              .expand((v) => v.quizQuestions)
              .toList(),
        ),
        biblePortions: const [
          BiblePortion(
            id: 'bp2-1',
            reference: 'Ephesians 4:32',
            passage: 'Ephesians 4',
            text: 'Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.',
          ),
          BiblePortion(
            id: 'bp2-2',
            reference: 'Judges 7:2',
            passage: 'Judges 7',
            text: 'The Lord said to Gideon, "You have too many men."',
          ),
          BiblePortion(
            id: 'bp2-3',
            reference: 'Proverbs 11:17',
            passage: 'Proverbs 11',
            text: 'Those who are kind benefit themselves, but the cruel bring ruin on themselves.',
          ),
        ],
        videos: SampleEpisodes.weeklyVideoLessons.where((v) => v.weekNumber == 2).toList(),
      ),
      TeenQuest(
        id: demoQuestThreeId,
        weekNumber: 3,
        title: 'True Strength',
        scripture: 'Judges 16:28',
        content: 'Strength comes from the Lord, not from us.',
        objectiveQuiz: _quizFrom(
          SampleEpisodes.weeklyVideoLessons
              .where((v) => v.weekNumber == 3)
              .expand((v) => v.quizQuestions)
              .toList(),
        ),
        biblePortions: const [
          BiblePortion(
            id: 'bp3-1',
            reference: 'Judges 16:28',
            passage: 'Judges 16',
            text: 'Then Samson prayed to the Lord, "Sovereign Lord, remember me."',
          ),
          BiblePortion(
            id: 'bp3-2',
            reference: 'Judges 13:5',
            passage: 'Judges 13',
            text: 'You will become a Nazirite, dedicated to God from the womb.',
          ),
        ],
        videos: SampleEpisodes.weeklyVideoLessons.where((v) => v.weekNumber == 3).toList(),
      ),
    ];
  }

  static List<TeenQuestQuizItem> _quizFrom(List<QuizQuestion> questions) {
    return [
      for (final q in questions)
        TeenQuestQuizItem(
          id: q.id,
          question: q.question,
          options: q.options,
          answerIndex: q.answerIndex,
          points: q.points,
        ),
    ];
  }

  static bool usesCatalogOrder(CurriculumTrack track) => true;

  static List<TeenQuest> planWeeks(CurriculumTrack track, {String? childId}) {
    return resolveWeeks(_idsFor(track, childId: childId), catalogOrder: usesCatalogOrder(track));
  }

  static List<TeenQuest> resolveWeeks(List<String> ids, {required bool catalogOrder}) {
    final catalog = demoWeeks();
    final byId = {for (final week in catalog) week.id: week};
    if (catalogOrder) {
      final want = ids.toSet();
      return catalog.where((week) => want.contains(week.id)).toList();
    }
    return [
      for (final id in ids)
        if (byId[id] != null) byId[id]!,
    ];
  }

  static List<String> _idsFor(CurriculumTrack track, {String? childId}) {
    switch (track) {
      case CurriculumTrack.home:
        return List.of(_familyPlan);
      case CurriculumTrack.personal:
        return List.of(_personalPlans[childId ?? samId] ?? const <String>[]);
    }
  }

  static List<String> _mutableIds(CurriculumTrack track, {String? childId}) {
    switch (track) {
      case CurriculumTrack.home:
        return _familyPlan;
      case CurriculumTrack.personal:
        return _personalPlans.putIfAbsent(childId ?? samId, () => <String>[]);
    }
  }

  static bool isInPlan(CurriculumTrack track, String questId, {String? childId}) {
    return _idsFor(track, childId: childId).contains(questId);
  }

  static void addToPlan(CurriculumTrack track, String questId, {String? childId}) {
    final ids = _mutableIds(track, childId: childId);
    if (!ids.contains(questId)) ids.add(questId);
  }

  static void removeFromPlan(CurriculumTrack track, String questId, {String? childId}) {
    _mutableIds(track, childId: childId).remove(questId);
  }

  static void markVideoWatched({
    required String questId,
    required String videoId,
    String? childId,
  }) {
    _watchedKeys.add('${childId ?? samId}|$questId|$videoId');
  }

  static bool isVideoWatched({
    required String questId,
    required String videoId,
    String? childId,
  }) {
    return _watchedKeys.contains('${childId ?? samId}|$questId|$videoId');
  }

  static bool weekVideosComplete(TeenQuest week, {String? childId}) {
    if (week.videos.isEmpty) return false;
    return week.videos.every(
      (video) => isVideoWatched(questId: week.id, videoId: video.id, childId: childId),
    );
  }

  static List<Map<String, dynamic>> demoEnrollments() => [
        _enrollment('st_1', 'Ethan Brooks', streak: 5, lastDayHours: 2),
        _enrollment('st_2', 'Sophia Chen', streak: 7, lastDayHours: 0),
        _enrollment('st_3', 'Lucas Vance', streak: 2, lastDayHours: 26),
        _enrollment('st_4', 'Maya Lin', streak: 4, lastDayHours: 4),
        _enrollment(samId, 'Johnson Peterson', familyId: familyId, streak: 3, lastDayHours: 1),
        _enrollment(childId, 'Alex Peterson', familyId: familyId, streak: 1, lastDayHours: 8),
        _enrollment('st_6', 'Zoe Adams', streak: 6, lastDayHours: 1),
      ];

  static Map<String, dynamic> _enrollment(
    String id,
    String name, {
    String? familyId,
    required int streak,
    required int lastDayHours,
  }) {
    return {
      'id': 'enr-$id',
      'classId': familyClassId,
      'childId': id,
      'status': 'APPROVED',
      'child': {
        'id': id,
        'name': name.trim(),
        if (familyId != null) 'familyId': familyId,
        'streak': {
          'current': streak,
          'lastDay': DateTime.now().subtract(Duration(hours: lastDayHours)).toIso8601String(),
        },
      },
    };
  }

  static List<Map<String, dynamic>> demoRecentScores() {
    final now = DateTime.now();
    return [
      _score('st_2', 'Sophia', 'TEEN_QUEST_OBJS', demoQuestId, 20, now.subtract(const Duration(minutes: 30))),
      _score(samId, 'Johnson Peterson', 'TEEN_QUEST_OBJS', demoQuestId, 40, now.subtract(const Duration(hours: 1))),
      _score('st_1', 'Ethan', 'TEEN_QUEST_OBJS', demoQuestId, 25, now.subtract(const Duration(hours: 2))),
      _score('st_6', 'Zoe', 'TEEN_QUEST_OBJS', demoQuestId, 40, now.subtract(const Duration(hours: 6))),
    ];
  }

  static Map<String, dynamic> _score(
    String childId,
    String name,
    String activityType,
    String refKey,
    int points,
    DateTime at,
  ) {
    return {
      'id': 'score-$childId-$refKey',
      'childId': childId,
      'activityType': activityType,
      'refKey': refKey,
      'points': points,
      'createdAt': at.toIso8601String(),
      'child': {'id': childId, 'name': name.trim().split(RegExp(r'\s+')).first},
    };
  }

  static Map<String, dynamic> classActivityJson() => {
        'enrollments': demoEnrollments(),
        'recentScores': demoRecentScores(),
      };

  static final List<Nudge> _demoNudges = [
    Nudge(
      id: 'demo-nudge-1',
      stickerKey: 'cheer',
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    ),
  ];

  static List<Nudge> demoNudges() => List.of(_demoNudges);

  static Nudge addDemoNudge(String stickerKey) {
    final nudge = Nudge(
      id: 'demo-nudge-${DateTime.now().millisecondsSinceEpoch}',
      stickerKey: stickerKey,
      createdAt: DateTime.now(),
    );
    _demoNudges.insert(0, nudge);
    return nudge;
  }

  static List<({String className, LeaderboardEntry entry})> demoFamilyGroupPositions() {
    LeaderboardEntry sam(int rank, int points) => LeaderboardEntry(
          rank: rank,
          childId: samId,
          childName: 'Johnson Peterson',
          points: points,
          isMine: true,
          isBlurred: false,
        );
    return [
      (className: 'Home class', entry: sam(3, 18)),
      (className: 'Sunday Teens', entry: sam(2, 40)),
      (className: 'Bible Quiz Club', entry: sam(1, 55)),
      (className: 'Youth Fellowship', entry: sam(4, 12)),
      (
        className: 'Home class',
        entry: LeaderboardEntry(
          rank: 5,
          childId: childId,
          childName: 'Alex Peterson',
          points: 24,
          isMine: true,
          isBlurred: false,
        ),
      ),
    ];
  }

  static List<LeaderboardEntry> demoLeaderboard(String? token, {String? classId}) {
    final totals = <String, int>{};
    for (final score in demoRecentScores()) {
      final id = '${score['childId']}';
      totals[id] = (totals[id] ?? 0) + (score['points'] as int? ?? 0);
    }

    final familyBoard = classId == familyId || classId == familyClassId;
    final rows = demoEnrollments().map((row) {
      final child = Map<String, dynamic>.from(row['child'] as Map);
      return (
        id: '${child['id']}',
        name: '${child['name'] ?? 'Student'}',
        familyId: child['familyId'] as String?,
        points: totals['${child['id']}'] ?? 0,
      );
    }).where((row) => !familyBoard || row.familyId == familyId).toList()
      ..sort((a, b) => b.points.compareTo(a.points));

    final viewerChildId = token == teenToken
        ? samId
        : token == childToken
            ? childId
            : null;
    final parentFamilyId = token == parentToken ? familyId : null;
    var anon = 1;

    return [
      for (var i = 0; i < rows.length; i++)
        () {
          final row = rows[i];
          final isMine = viewerChildId != null
              ? row.id == viewerChildId
              : parentFamilyId != null && row.familyId == parentFamilyId;
          final first = row.name.trim().split(RegExp(r'\s+')).first;
          final showName = viewerChildId != null || isMine;
          return LeaderboardEntry(
            rank: i + 1,
            childId: isMine ? row.id : null,
            childName: showName ? first : 'Participant #${anon++}',
            points: row.points,
            isMine: isMine,
            isBlurred: !showName,
          );
        }(),
    ];
  }
}
