import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/models/api_models.dart';
import 'package:teen_aventure/models/week_quest_progress.dart';
import 'package:teen_aventure/providers/current_quest_provider.dart';
import 'package:teen_aventure/services/content_service.dart';

Map<String, dynamic> _response({List<String> watched = const [], int videoCount = 4}) => {
      'weekNumber': 50,
      'totalWeeks': 52,
      'weeksCompleted': 49,
      'caughtUp': false,
      'tracked': true,
      'quest': {
        'id': 'q50',
        'weekNumber': 50,
        'title': 'Week 50: Revelation 1–7',
        'scripture': 'Revelation 1:8 — I am Alpha and Omega.',
        'content': '',
        'videos': [
          for (var i = 1; i <= videoCount; i++)
            {'id': 'w50-v$i', 'partNumber': i, 'title': 'Part $i', 'videoUrl': 'https://youtu.be/x'},
        ],
      },
      'progress': {'watchedVideoIds': watched, 'quizDone': false, 'puzzleDone': false},
      'activityPoints': {
        'VIDEO_WATCH': 7,
        'TEEN_QUEST_OBJS': 3,
        'PUZZLE_SOLVE': 3,
        'PRAYER_DECLARATION': 1,
      },
    };

void main() {
  test('parses the self-paced week from the backend', () {
    final current = CurrentQuest.fromJson(_response(watched: ['w50-v1']));
    final again = CurrentQuest.fromJson(current.toJson());
    expect(again.weekNumber, 50);
    expect(again.weeksCompleted, 49);
    expect(again.tracked, isTrue);
    expect(again.passage, 'Revelation 1–7');
    expect(again.quest.videos.map((v) => v.id), ['w50-v1', 'w50-v2', 'w50-v3', 'w50-v4']);
    expect(again.quest.videos.first.videoUrl, 'https://youtu.be/x');
    expect(again.watchedVideoIds, ['w50-v1']);
    expect(again.videoPoints, 7);
  });

  test('parses Flutter web JSON where numbers arrive as doubles', () {
    final current = CurrentQuest.fromJson({
      'weekNumber': 1.0,
      'totalWeeks': 52.0,
      'weeksCompleted': 0.0,
      'caughtUp': false,
      'tracked': true,
      'quest': {
        'id': 'q1',
        'weekNumber': 1.0,
        'title': 'Week 1: Genesis 1–8',
        'scripture': 'Genesis 1:1',
        'content': '',
        'objectiveQuiz': [
          {
            'id': 'q',
            'question': 'Who created?',
            'options': ['God', 'Man'],
            'answerIndex': 0.0,
            'points': 5.0,
          },
        ],
        'videos': [
          {
            'id': 'w1-v1',
            'partNumber': 1.0,
            'weekNumber': 1.0,
            'title': 'Part 1',
            'videoUrl': 'https://youtu.be/x',
          },
        ],
      },
      'progress': {
        'watchedVideoIds': <String>[],
        'quizDone': false,
        'puzzleDone': false,
      },
    });
    expect(current.weekNumber, 1);
    expect(current.totalWeeks, 52);
    expect(current.quest.weekNumber, 1);
    expect(current.quest.videos.single.partNumber, 1);
    expect(current.quest.objectiveQuiz.single.answerIndex, 0);
    expect(current.quest.objectiveQuiz.single.points, 5);
  });

  test('offline reload keeps the saved week and a miss with no save stays empty', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    var failFetch = false;
    final provider = CurrentQuestProvider(
      null,
      prefs: prefs,
      online: () async => false,
      fetch: () async {
        if (failFetch) throw Exception('down');
        return CurrentQuest.fromJson(_response());
      },
    );
    provider.syncIdentity(authenticated: true, userId: 'u', childId: 'c');
    await _untilSettled(provider);
    expect(provider.current?.weekNumber, 50);
    expect(provider.isOffline, isFalse);

    failFetch = true;
    await provider.refresh();
    expect(provider.current?.passage, 'Revelation 1–7');
    expect(provider.isOffline, isTrue);

    final restored = CurrentQuestProvider(
      null,
      prefs: prefs,
      online: () async => false,
      fetch: () async => throw Exception('down'),
    );
    restored.syncIdentity(authenticated: true, userId: 'u', childId: 'c');
    expect(restored.current?.weekNumber, 50);
    await _untilSettled(restored);
    expect(restored.current?.quest.videos.first.title, 'Part 1');
    expect(restored.isOffline, isTrue);

    final empty = CurrentQuestProvider(
      null,
      online: () async => false,
      fetch: () async => throw Exception('down'),
    );
    empty.syncIdentity(authenticated: true, userId: 'new', childId: null);
    await _untilSettled(empty);
    expect(empty.current, isNull);
    expect(empty.isOffline, isTrue);
    expect(empty.isLoading, isFalse);
  });

  test('a later video counts as watched before the earlier ones', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final provider = CurrentQuestProvider(
      null,
      prefs: prefs,
      online: () async => true,
      fetch: () async => CurrentQuest.fromJson(_response(watched: ['w50-v3'])),
    );
    provider.syncIdentity(authenticated: true, userId: 'u', childId: 'c');
    await _untilSettled(provider);
    final progress = provider.progress!;
    expect(progress.watchedAt(2), isTrue);
    expect(progress.watchedAt(0), isFalse);
    expect(progress.nextVideoIndex, 0);
    expect(progress.videosFinished, isFalse);
    expect(progress.videosCompleted, 1);
  });

  test('device progress survives a thinner server refresh', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    var remote = CurrentQuest.fromJson(_response(watched: const []));
    final provider = CurrentQuestProvider(
      null,
      prefs: prefs,
      online: () async => true,
      fetch: () async => remote,
    );
    provider.syncIdentity(authenticated: true, userId: 'u', childId: 'c');
    await _untilSettled(provider);
    provider.rememberWatched('w50-v1');
    provider.rememberWatched('w50-v2');
    expect(provider.current?.watchedVideoIds, ['w50-v1', 'w50-v2']);

    remote = CurrentQuest.fromJson(_response(watched: const []));
    await provider.refresh();
    expect(provider.current?.watchedVideoIds, ['w50-v1', 'w50-v2']);

    final cold = CurrentQuestProvider(
      null,
      prefs: prefs,
      online: () async => false,
      fetch: () async => throw Exception('down'),
    );
    cold.syncIdentity(authenticated: true, userId: 'u', childId: 'c');
    expect(cold.current?.watchedVideoIds, ['w50-v1', 'w50-v2']);
  });

  test('pull-to-refresh reloads week content from the database', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    var title = 'Week 50: Old title';
    final provider = CurrentQuestProvider(
      null,
      prefs: prefs,
      online: () async => true,
      fetch: () async => CurrentQuest.fromJson({
        ..._response(),
        'quest': {
          ...(_response()['quest'] as Map<String, dynamic>),
          'title': title,
        },
      }),
      loadWeek: (week) async => TeenQuest.fromJson({
        'id': 'q$week',
        'weekNumber': week,
        'title': title,
        'scripture': 'Revelation 1:8',
        'content': 'fresh body',
        'videos': [
          {'id': 'w50-v1', 'partNumber': 1, 'title': 'Part 1', 'videoUrl': 'https://youtu.be/x'},
        ],
        'puzzleId': 'puzzle-new',
      }),
    );
    provider.syncIdentity(authenticated: true, userId: 'u', childId: 'c');
    await _untilSettled(provider);
    expect(provider.current?.passage, 'Old title');

    title = 'Week 50: Updated from admin';
    await provider.refresh();
    expect(provider.current?.passage, 'Updated from admin');
    expect(provider.current?.quest.content, 'fresh body');
    expect(provider.current?.quest.puzzleId, 'puzzle-new');
  });

  test('browseToWeek sets quest of the day without resetting highest level', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final provider = CurrentQuestProvider(
      null,
      prefs: prefs,
      online: () async => true,
      fetch: () async => CurrentQuest.fromJson(_response()),
      loadWeek: (week) async => TeenQuest.fromJson({
        'id': 'q$week',
        'weekNumber': week,
        'title': 'Week $week: Browse passage',
        'scripture': 'Genesis 1:1',
        'content': '',
        'videos': [
          {'id': 'w$week-v1', 'partNumber': 1, 'title': 'Part $week', 'videoUrl': 'https://youtu.be/x'},
        ],
      }),
    );
    provider.syncIdentity(authenticated: true, userId: 'u', childId: 'c');
    await _untilSettled(provider);
    expect(provider.progressAnchor?.weekNumber, 50);
    expect(provider.progressAnchor?.weeksCompleted, 49);

    await provider.browseToWeek(3);
    expect(provider.isBrowsing, isTrue);
    expect(provider.current?.weekNumber, 3);
    expect(provider.progressAnchor?.weekNumber, 50);
    expect(provider.progressAnchor?.weeksCompleted, 49);
    expect(provider.current?.weeksCompleted, 49);

    await provider.browseToWeek(50);
    expect(provider.isBrowsing, isFalse);
    expect(provider.current?.weekNumber, 50);
    expect(provider.progressAnchor?.weekNumber, 50);
  });

  test('browseToWeek refresh keeps the browsed week', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final provider = CurrentQuestProvider(
      null,
      prefs: prefs,
      online: () async => true,
      fetch: () async => CurrentQuest.fromJson(_response()),
      loadWeek: (week) async => TeenQuest.fromJson({
        'id': 'q$week',
        'weekNumber': week,
        'title': 'Week $week: Test passage',
        'scripture': 'Genesis 1:1',
        'content': '',
        'videos': [
          {'id': 'w$week-v1', 'partNumber': 1, 'title': 'Part $week', 'videoUrl': 'https://youtu.be/x'},
        ],
      }),
    );
    provider.syncIdentity(authenticated: true, userId: 'u', childId: 'c');
    await _untilSettled(provider);

    await provider.browseToWeek(51);
    expect(provider.isBrowsing, isTrue);
    expect(provider.current?.weekNumber, 51);
    expect(provider.current?.passage, 'Test passage');

    await provider.refresh();
    expect(provider.current?.weekNumber, 51);
    expect(provider.current?.passage, 'Test passage');
    expect(provider.current?.quest.videos.single.title, 'Part 51');

    await provider.browseToWeek(50);
    expect(provider.isBrowsing, isFalse);
    expect(provider.current?.weekNumber, 50);
  });

  test('weeks with 4 videos need all 4 before the quiz opens', () {
    const three = WeekQuestProgress(videosDone: 3, quizDone: false, puzzleDone: false, videoCount: 4);
    expect(three.videosFinished, isFalse);
    expect(three.nextVideoIndex, 3);
    expect(three.totalSessions, 6);
    expect(three.marks.map((m) => m.label), ['V1', 'V2', 'V3', 'V4', 'Quiz', 'Game']);

    const done = WeekQuestProgress(videosDone: 4, quizDone: true, puzzleDone: true, videoCount: 4);
    expect(done.isCaughtUp, isTrue);
  });

  test('a late refresh cannot show the previous explorer’s ticks', () async {
    final first = Completer<CurrentQuest?>();
    var requests = 0;
    final provider = CurrentQuestProvider(
      null,
      fetch: () => requests++ == 0
          ? first.future
          : Future.value(CurrentQuest.fromJson(_response())),
    );
    provider.syncIdentity(authenticated: true, userId: 'u', childId: 'ada');
    await pumpEventQueue();
    provider.syncIdentity(authenticated: true, userId: 'u', childId: 'ben');
    await _untilSettled(provider);

    first.complete(CurrentQuest.fromJson(_response(watched: ['w50-v1'])));
    await pumpEventQueue();

    expect(provider.progress?.videosDone, 0);
  });

  test('failed quiz step is retried on the next refresh', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final completed = <String>[];
    var failComplete = true;
    var remote = CurrentQuest.fromJson(_response());
    final provider = CurrentQuestProvider(
      null,
      prefs: prefs,
      online: () async => true,
      fetch: () async => remote,
      complete: (week, step) async {
        if (failComplete) throw Exception('offline');
        completed.add('$week:$step');
        return CurrentQuest.fromJson(_response(watched: const [])).withStep(step);
      },
    );
    provider.syncIdentity(authenticated: true, userId: 'u', childId: 'c');
    await _untilSettled(provider);

    await provider.completeStep('QUIZ');
    expect(provider.current?.quizDone, isTrue);
    expect(completed, isEmpty);

    failComplete = false;
    remote = CurrentQuest.fromJson(_response());
    await provider.refresh();
    expect(completed, ['50:QUIZ']);
  });

  test('a completed video shows its tick before the points request returns', () async {
    SharedPreferences.setMockInitialValues({});
    final response = Completer<ActivityAward>();
    final provider = CurrentQuestProvider(
      null,
      prefs: await SharedPreferences.getInstance(),
      online: () async => true,
      fetch: () async => CurrentQuest.fromJson(_response()),
      markVideo: (_, __) => response.future,
    );
    provider.syncIdentity(authenticated: true, userId: 'u', childId: 'c');
    await _untilSettled(provider);

    final completion = provider.recordVideoWatched(videoId: 'w50-v1', weekNumber: 50);
    expect(provider.progress?.watchedAt(0), isTrue);
    expect(provider.progress?.watchedAt(1), isFalse);
    response.complete(const ActivityAward(ok: true, points: 7, alreadyAwarded: false));
    expect(await completion, 7);
  });

  test('video points apply once when queued playback syncs and on fresh playback', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final posted = <String>{};
    final awarded = <int>[];
    var online = false;
    final provider = CurrentQuestProvider(
      null,
      prefs: prefs,
      online: () async => online,
      fetch: () async => CurrentQuest.fromJson(_response()),
      onVideoPoints: awarded.add,
      markVideo: (week, videoId) async => ActivityAward(
        ok: true,
        points: 7,
        alreadyAwarded: !posted.add(videoId),
      ),
    );
    provider.syncIdentity(authenticated: true, userId: 'u', childId: 'c');
    await _untilSettled(provider);

    expect(await provider.recordVideoWatched(videoId: 'w50-v1', weekNumber: 50), 0);
    expect(provider.progress?.watchedAt(0), isTrue);
    expect(posted, isEmpty);
    expect(awarded, isEmpty);

    online = true;
    await provider.refresh();
    expect(posted, {'w50-v1'});
    expect(awarded, [7]);

    expect(await provider.recordVideoWatched(videoId: 'w50-v2', weekNumber: 50), 7);
    expect(await provider.recordVideoWatched(videoId: 'w50-v2', weekNumber: 50), 0);
    expect(awarded, [7, 7]);
  });

  test('browseToWeek loads finished activities from the server', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final provider = CurrentQuestProvider(
      null,
      prefs: prefs,
      online: () async => true,
      fetch: () async => CurrentQuest.fromJson(_response()),
      loadWeek: (week) async => TeenQuest.fromJson({
        'id': 'q$week',
        'weekNumber': week,
        'title': 'Week $week: Browse passage',
        'scripture': 'Genesis 1:1',
        'content': '',
        'videos': [
          {'id': 'w$week-v1', 'partNumber': 1, 'title': 'Part $week', 'videoUrl': 'https://youtu.be/x'},
          {'id': 'w$week-v2', 'partNumber': 2, 'title': 'Part $week-b', 'videoUrl': 'https://youtu.be/y'},
        ],
      }),
      loadWeekProgress: (week) async => WeekActivityProgress(
        weekNumber: week,
        watchedVideoIds: ['w$week-v1'],
        quizDone: true,
        puzzleDone: false,
        tracked: true,
      ),
    );
    provider.syncIdentity(authenticated: true, userId: 'u', childId: 'c');
    await _untilSettled(provider);

    await provider.browseToWeek(3);
    expect(provider.current?.weekNumber, 3);
    expect(provider.current?.watchedVideoIds, ['w3-v1']);
    expect(provider.current?.quizDone, isTrue);
    expect(provider.current?.puzzleDone, isFalse);
  });
}

Future<void> _untilSettled(CurrentQuestProvider provider) async {
  for (var i = 0; i < 20 && provider.isLoading; i++) {
    await Future<void>.delayed(Duration.zero);
  }
  expect(provider.isLoading, isFalse);
}
