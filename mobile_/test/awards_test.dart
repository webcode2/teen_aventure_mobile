import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/quest_milestones.dart';
import 'package:teen_aventure/screens/adult/child_achievement_record_screen.dart';
import 'package:teen_aventure/services/engagement_service.dart';

const _awards = [
  QuestMilestone(id: 'a1', title: 'New Quester', criteria: 'Week 1 complete', weekComplete: 1),
  QuestMilestone(id: 'a2', title: 'Ardent Reader', criteria: 'Week 2 complete', weekComplete: 2),
  QuestMilestone(id: 'a6', title: 'Great Follower', criteria: 'Week 6 complete', weekComplete: 6),
];

Map<String, bool> _earnedByTitle(List<({QuestMilestone milestone, bool earned})> states) =>
    {for (final s in states) s.milestone.title: s.earned};

void main() {
  test('awards come from the person\'s saved record, not their week count', () {
    final states = awardStates(
      _awards,
      weeksCompleted: 9, // ignored when the server sends a record
      earned: const [EarnedAward(awardId: 'a1', title: 'New Quester', weekNumber: 1)],
    );
    expect(_earnedByTitle(states), {'New Quester': true, 'Ardent Reader': false, 'Great Follower': false});
  });

  test('a renamed award stays earned and a removed one is still shown', () {
    final states = awardStates(
      const [
        QuestMilestone(id: 'a1', title: 'Renamed Quester', criteria: '', weekComplete: 1),
        QuestMilestone(id: 'a6', title: 'Great Follower', criteria: '', weekComplete: 6),
      ],
      weeksCompleted: 0,
      earned: const [
        EarnedAward(awardId: 'a1', title: 'New Quester', weekNumber: 1),
        EarnedAward(awardId: null, title: 'Ardent Reader', weekNumber: 2),
      ],
    );
    expect(_earnedByTitle(states), {'Renamed Quester': true, 'Ardent Reader': true, 'Great Follower': false});
    expect(states.map((s) => s.milestone.weekComplete), [1, 2, 6]);
  });

  test('an older API without saved awards falls back to weeks completed', () {
    expect(_earnedByTitle(awardStates(_awards, weeksCompleted: 2)),
        {'New Quester': true, 'Ardent Reader': true, 'Great Follower': false});
  });

  test('achievements parse award ids and each person\'s saved awards', () {
    final data = Achievements.fromJson({
      'self': {'tracked': true, 'weeksCompleted': 1, 'earnedAwards': [
        {'awardId': 'a1', 'title': 'New Quester', 'weekNumber': 1, 'earnedAt': '2026-11-12T10:00:00.000Z'},
      ]},
      'explorers': [
        {'childId': 'c', 'name': 'Testkid', 'weeksCompleted': 0},
      ],
      'awards': [
        {'id': 'a1', 'title': 'New Quester', 'weekNumber': 1, 'criteria': 'Week 1 complete'},
      ],
    });
    expect(data.awards.single.id, 'a1');
    expect(data.self.earnedAwards!.single.title, 'New Quester');
    expect(data.self.earnedAwards!.single.earnedAt, DateTime.utc(2026, 11, 12, 10));
    expect(data.explorers.single.earnedAwards, isNull); // older API shape
  });

  testWidgets('a person\'s record shows their own awards and how to unlock the rest', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: ChildAchievementRecordScreen(
        child: AchievementRecord(
          childId: 'c',
          name: 'Testkid',
          weeksCompleted: 1,
          earnedAwards: [EarnedAward(awardId: 'a1', title: 'New Quester', weekNumber: 1)],
        ),
        familyPoints: 0,
        awards: _awards,
      ),
    ));
    expect(find.text('Awards'), findsOneWidget);
    expect(find.text('New Quester'), findsOneWidget);
    expect(find.byTooltip('Earned: New Quester'), findsOneWidget);
    expect(find.byTooltip('Complete week 6 in order to unlock'), findsOneWidget);
  });
}
