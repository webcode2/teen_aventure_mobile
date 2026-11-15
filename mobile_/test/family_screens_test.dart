import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/screens/adult/parent_home_panel.dart';
import 'package:teen_aventure/screens/family/add_explorer_screen.dart';
import 'package:teen_aventure/screens/family/family_screen.dart';
import 'package:teen_aventure/screens/groups/groups_screen.dart';
import 'package:teen_aventure/screens/shared/widgets/hero_banner.dart';

void main() {
  group('validatePinPair', () {
    test('needs four digits that match', () {
      expect(validatePinPair('12', '12'), 'PIN must be 4 digits');
      expect(validatePinPair('1234', '1243'), 'The PINs do not match');
      expect(validatePinPair('1234', '1234'), isNull);
    });
  });

  testWidgets('Add explorer asks the creator for a PIN for under-15s', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: AddExplorerScreen()));
    // The PIN shows by default, before any age is entered.
    expect(find.text('4-digit PIN'), findsOneWidget);

    await tester.enterText(find.byKey(const ValueKey('explorer-name')), 'Sam');
    await tester.enterText(find.byKey(const ValueKey('explorer-age')), '8');
    await tester.pump();
    expect(find.text('4-digit PIN'), findsOneWidget);
    expect(find.text('Confirm PIN'), findsOneWidget);
    expect(find.text('Generate PIN'), findsNothing);

    await tester.tap(find.byKey(const ValueKey('save-explorer')));
    await tester.pump();
    expect(find.text('PIN must be 4 digits'), findsWidgets);

    await tester.enterText(find.widgetWithText(TextFormField, '4-digit PIN'), '4821');
    await tester.enterText(find.widgetWithText(TextFormField, 'Confirm PIN'), '4822');
    await tester.tap(find.byKey(const ValueKey('save-explorer')));
    await tester.pump();
    expect(find.text('The PINs do not match'), findsOneWidget);
  });

  testWidgets('an age of 15+ swaps the PIN for required email and password, and back', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: AddExplorerScreen()));
    await tester.enterText(find.byKey(const ValueKey('explorer-name')), 'Maya');
    await tester.enterText(find.byKey(const ValueKey('explorer-age')), '16');
    await tester.pumpAndSettle();
    expect(find.text('4-digit PIN'), findsNothing);
    expect(find.byKey(const ValueKey('explorer-email')), findsOneWidget);
    expect(find.byKey(const ValueKey('explorer-password')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('save-explorer')));
    await tester.pump();
    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);

    await tester.enterText(find.byKey(const ValueKey('explorer-age')), '9');
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('explorer-email')), findsNothing);
    expect(find.text('4-digit PIN'), findsOneWidget);
  });

  testWidgets('family options menu lists only the allowed actions', (tester) async {
    Future<void> open(FamilyPanelActions actions) async {
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(appBar: AppBar(actions: [FamilyOptionsMenu(actions: actions)])),
      ));
      await tester.tap(find.byKey(const ValueKey('family-options')));
      await tester.pumpAndSettle();
    }

    await open(FamilyPanelActions(
      title: 'My family',
      allGroups: () {},
      addExplorer: () {},
      inviteGuardian: () {},
      addGuardian: () {},
      updateFamily: () {},
    ));
    for (final label in ['Add explorer', 'Invite guardian', 'Add guardian', 'Update family', 'All groups']) {
      expect(find.text(label), findsOneWidget);
    }
    expect(find.text('Add admin'), findsNothing);

    await tester.tapAt(const Offset(5, 300));
    await tester.pumpAndSettle();
    var opened = false;
    await open(FamilyPanelActions(title: 'Okafor Home', allGroups: () => opened = true));
    expect(find.text('Invite guardian'), findsNothing);
    await tester.tap(find.text('All groups'));
    await tester.pumpAndSettle();
    expect(opened, isTrue);
  });

  test('the family you own reads as My Family', () {
    expect(membershipDisplayName({'kind': 'FAMILY', 'role': 'Owner', 'name': 'Okafor Home'}, 'Group'), 'My Family');
    expect(membershipDisplayName({'kind': 'FAMILY', 'role': 'Guardian', 'name': 'Okafor Home'}, 'Group'), 'Okafor Home');
    expect(membershipDisplayName({'kind': 'CLASS', 'role': 'Owner', 'name': 'Youth'}, 'Group'), 'Youth');
  });

  testWidgets('hero banner shows the title and badge', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: HeroBanner(avatar: Text('G'), title: 'Grace Okafor', badge: 'Parent')),
    ));
    expect(find.text('Grace Okafor'), findsOneWidget);
    expect(find.text('Parent'), findsOneWidget);
  });
}
