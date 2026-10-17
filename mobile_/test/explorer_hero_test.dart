import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/screens/teen/widgets/explorer_hero.dart';

void main() {
  testWidgets('hero lays out inside the home scroll view', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: ExplorerHero(),
          ),
        ),
      ),
    );
    expect(tester.takeException(), isNull);
    expect(find.text('Hey, Explorer!'), findsOneWidget);
  });
}
