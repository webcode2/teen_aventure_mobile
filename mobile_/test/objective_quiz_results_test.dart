import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/models/puzzle.dart';
import 'package:teen_aventure/screens/teen/objective_quiz_screen.dart';

const _questions = [
  QuizQuestion(id: 'one', question: 'Question one', options: ['Correct', 'Wrong'], answerIndex: 0),
  QuizQuestion(id: 'two', question: 'Question two', options: ['Correct', 'Wrong'], answerIndex: 0),
];

Future<void> _answerOneRightOneWrong(WidgetTester tester) async {
  await tester.tap(find.text('Correct'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Check'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Next'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Wrong'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Check'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('See results'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('practice results show the score out of 10 and its message', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: ObjectiveQuizScreen(alreadyCompleted: true, questionsOverride: _questions),
    ));
    await _answerOneRightOneWrong(tester);
    expect(find.text('5/10'), findsOneWidget);
    expect(find.text('1 / 2 correct'), findsOneWidget);
    expect(find.textContaining('Good effort'), findsOneWidget);
    expect(find.text('Nice review. No new points this time.'), findsOneWidget);
  });

  testWidgets('a live quiz shows the points the server awarded for the score', (tester) async {
    List<Object>? sent;
    await tester.pumpWidget(MaterialApp(
      home: ObjectiveQuizScreen(
        questionsOverride: _questions,
        onSubmitLive: (answers) async {
          sent = answers;
          return 3;
        },
      ),
    ));
    await _answerOneRightOneWrong(tester);
    expect(sent, [0, 1]);
    expect(find.text('You earned +3 points for this score.'), findsOneWidget);
  });
}
