import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/models/puzzle.dart';
import 'package:teen_aventure/screens/teen/objective_quiz_screen.dart';

void main() {
  testWidgets('practice results use the actual quiz length and count correct answers', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: ObjectiveQuizScreen(
        alreadyCompleted: true,
        questionsOverride: [
          QuizQuestion(id: 'one', question: 'Question one', options: ['Correct', 'Wrong'], answerIndex: 0),
          QuizQuestion(id: 'two', question: 'Question two', options: ['Correct', 'Wrong'], answerIndex: 0),
        ],
      ),
    ));
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
    expect(find.text('1 / 2 correct'), findsOneWidget);
    expect(find.text('Nice review. No new points this time.'), findsOneWidget);
  });
}
