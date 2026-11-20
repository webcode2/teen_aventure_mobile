import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/screens/teen/widgets/puzzle_win_dialog.dart';

void main() {
  testWidgets('Completion flowers fall and fade while the dialog stays open',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: PuzzleWinDialog(
          elapsed: Duration(seconds: 17),
        ),
      ),
    );

    final flowers = find.text('🌸');
    final flower = flowers.first;
    final opacity = find.ancestor(of: flower, matching: find.byType(Opacity));

    await tester.pump(const Duration(milliseconds: 1600));
    final burstPosition = tester.getCenter(flower);
    final burstOpacity = tester.widget<Opacity>(opacity.first).opacity;

    await tester.pump(const Duration(milliseconds: 600));
    expect(tester.getCenter(flower).dy, greaterThan(burstPosition.dy));
    expect(
        tester.widget<Opacity>(opacity.first).opacity, lessThan(burstOpacity));

    await tester.pump(const Duration(milliseconds: 600));
    expect(flowers, findsNothing);
    expect(find.text('Time used  00:17'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
  });
}
