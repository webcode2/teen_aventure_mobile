import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/screens/groups/family_invite_card.dart';

void main() {
  Future<List<String>> pumpCard(WidgetTester tester, {String? invitedBy}) async {
    final taps = <String>[];
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: FamilyInviteCard(
          name: 'Okafor Home',
          invitedBy: invitedBy,
          onAccept: () => taps.add('accept'),
          onDecline: () => taps.add('decline'),
        ),
      ),
    ));
    return taps;
  }

  testWidgets('names the family and who sent the invite', (tester) async {
    await pumpCard(tester, invitedBy: 'Grace');
    expect(find.text('Join Okafor Home?'), findsOneWidget);
    expect(find.textContaining('Grace invited you to this family.'), findsOneWidget);
    expect(find.textContaining('Your points will count for the family.'), findsOneWidget);
  });

  testWidgets('reads naturally when the sender is unknown', (tester) async {
    await pumpCard(tester);
    expect(find.textContaining('You were invited to this family.'), findsOneWidget);
  });

  testWidgets('accept and decline call their handlers', (tester) async {
    final taps = await pumpCard(tester, invitedBy: 'Grace');
    await tester.tap(find.text('Join family'));
    await tester.tap(find.text('Decline'));
    expect(taps, ['accept', 'decline']);
  });
}
