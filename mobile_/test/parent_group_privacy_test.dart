import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:teen_aventure/models/api_models.dart';
import 'package:teen_aventure/models/auth_session.dart';
import 'package:teen_aventure/screens/groups/group_standing_board.dart';
import 'package:teen_aventure/screens/groups/groups_screen.dart';

void main() {
  test('redacted API points parse safely and stay out of group summary', () {
    final detail = GroupDetail.fromJson({
      'id': 'group-a', 'kind': 'CLASS', 'points': null, 'pointsHidden': true,
      'standings': [{'rank': 1, 'childName': 'Other', 'points': null, 'isMine': false, 'isBlurred': true}],
    });
    expect(detail.standings.single.isBlurred, isTrue);
    expect(detail.mergeInto({})['points'], isNull);
    expect(detail.mergeInto({})['pointsHidden'], isTrue);
  });

  testWidgets('parent sees own explorer fully and peer first name with masked surname and points', (tester) async {
    final session = AuthSession.test(authenticated: true, shell: AppShell.parent);
    await tester.pumpWidget(ChangeNotifierProvider<AuthSession>.value(value: session, child: MaterialApp(home: Scaffold(body: GroupStandingBoard(entriesOverride: [
      LeaderboardEntry.fromJson({'rank': 1, 'childId': 'mine', 'childName': 'My Explorer Surname', 'points': 25, 'isMine': true, 'isBlurred': false}),
      LeaderboardEntry.fromJson({'rank': 2, 'childName': 'Other', 'points': null, 'isMine': false, 'isBlurred': true}),
    ])))));
    await tester.pump();
    expect(find.text('My Explorer Surname'), findsOneWidget);
    expect(find.text('25 pts'), findsOneWidget);
    expect(find.text('Other ••••'), findsOneWidget);
    expect(find.text('••• pts'), findsOneWidget);
    expect(find.text('0 pts'), findsNothing);
    expect(find.text('Your explorer'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('parent groups overview includes read-only groups joined by linked teens', (tester) async {
    final session = AuthSession.test(authenticated: true, shell: AppShell.parent);
    await tester.pumpWidget(ChangeNotifierProvider<AuthSession>.value(value: session, child: const MaterialApp(home: Scaffold(body: GroupsScreen(embedded: true, membershipsOverride: {
      'items': [
        {'id': 'home', 'kind': 'FAMILY', 'name': 'Home family', 'role': 'Owner', 'canAdmin': true},
        {'id': 'teen-group', 'kind': 'CLASS', 'groupKind': 'CUSTOM', 'name': 'Teen accepted circle', 'role': 'Parent observer', 'canAdmin': false, 'canLeave': false},
      ],
    })))));
    await tester.pumpAndSettle();
    expect(find.text('Home family'), findsOneWidget);
    expect(find.widgetWithText(TextButton, 'Family'), findsOneWidget);
    expect(find.text('Teen accepted circle'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
