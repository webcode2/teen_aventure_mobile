import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/models/week_quest_progress.dart';
import 'package:teen_aventure/screens/teen/widgets/todays_quest_card.dart';

void main() {
  testWidgets('TodaysQuestSlide builds without previous/next week controls', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: TodaysQuestSlide(
              weekLabel: 'Week 4',
              passage: 'David and Goliath',
              subtitle: '1 Samuel 17:45',
              videoSubtitles: const ['Part 1', 'Part 2', 'Part 3'],
              onOpenVideo: (_) {},
              onQuiz: () {},
              onPuzzle: () {},
              progress: const WeekQuestProgress(
                videosDone: 0,
                quizDone: false,
                puzzleDone: false,
                videoCount: 3,
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text("Today's Quest · Week 4"), findsOneWidget);
    expect(find.text('1 Samuel 17:45'), findsOneWidget);
    expect(find.text('Part 1'), findsOneWidget);
    // Week prev/next controls removed — tooltips must not appear.
    expect(find.byTooltip('Previous week'), findsNothing);
    expect(find.byTooltip('Next week'), findsNothing);
  });
}
