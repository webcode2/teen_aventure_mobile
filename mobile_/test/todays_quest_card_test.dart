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

  testWidgets('each part keeps its place and the next one is the big card', (tester) async {
    int? opened;
    Future<void> show(Set<int> watched) => tester.pumpWidget(MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: TodaysQuestSlide(
                passage: 'Psalm 23',
                subtitle: 'Week 4',
                videoSubtitles: const ['Part 1', 'Part 2', 'Part 3'],
                onOpenVideo: (index) => opened = index,
                onQuiz: () {},
                onPuzzle: () {},
                progress: WeekQuestProgress(
                  videosDone: watched.length,
                  quizDone: false,
                  puzzleDone: false,
                  watchedIndexes: watched,
                ),
              ),
            ),
          ),
        ));
    Finder row(int index) => find.byKey(ValueKey('home-video-$index'));
    Finder tick(int index) => find.descendant(
          of: row(index),
          matching: find.byIcon(Icons.check_rounded),
        );

    for (var next = 0; next < 3; next++) {
      await show({for (var i = 0; i < next; i++) i});
      final action = find.widgetWithText(FilledButton, 'Watch video');
      expect(find.descendant(of: row(next), matching: action), findsOneWidget);
      for (var i = 0; i < 3; i++) {
        expect(tick(i), i < next ? findsOneWidget : findsNothing);
        if (i > 0) {
          expect(tester.getTopLeft(row(i - 1)).dy, lessThan(tester.getTopLeft(row(i)).dy));
        }
      }
      await tester.tap(action);
      expect(opened, next);
    }

    await show({0, 1, 2});
    expect(find.widgetWithText(FilledButton, 'Watch video'), findsNothing);
    for (var i = 0; i < 3; i++) {
      expect(tick(i), findsOneWidget);
    }
  });

}
