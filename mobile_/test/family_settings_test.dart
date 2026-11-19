import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/models/auth_session.dart';
import 'package:teen_aventure/screens/family/family_screen.dart';
import 'package:teen_aventure/services/api_client.dart';
import 'package:teen_aventure/services/auth_service.dart';
import 'package:teen_aventure/services/engagement_service.dart';
import 'package:teen_aventure/services/family_service.dart';

void main() {
  testWidgets(
      'family owner edits details, adds a guardian, sets a PIN and adds explorers',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final api = await ApiClient.create();
    final session =
        AuthSession.test(authenticated: true, shell: AppShell.parent)
          ..userId = 'owner';
    final family = <String, dynamic>{
      'id': 'family-1',
      'name': 'Original family',
      'description': 'Old description',
      'ownerUserId': 'owner',
      'children': <Map<String, dynamic>>[
        {'id': 'explorer', 'name': 'Rejoice', 'ageBand': 'CHILD'},
      ],
      'guardians': <Map<String, dynamic>>[
        {
          'relation': 'Guardian',
          'user': {'name': 'Existing Adult', 'email': 'existing@example.com'},
        },
      ],
    };
    String? savedPin;
    String? guardianEmail;
    Map<String, dynamic>? createdExplorer;
    Map<String, dynamic>? sentInvite;
    final adultRequests = <Map<String, dynamic>>[];
    api.dio.interceptors.add(InterceptorsWrapper(
      onRequest: (request, handler) {
        final route = '${request.method} ${request.path}';
        Object data = <String, dynamic>{};
        var statusCode = 200;
        switch (route) {
          case 'GET /api/v1/families/my':
            data = Map<String, dynamic>.of(family);
          case 'GET /api/v1/engagement/nudge-templates':
            data = [];
          case 'PATCH /api/v1/families/my':
            family.addAll(Map<String, dynamic>.from(request.data as Map));
          case 'POST /api/v1/families/guardians':
            guardianEmail = (request.data as Map)['email'] as String;
            expect((request.data as Map)['relation'], 'Admin');
            final guardians = family['guardians'] as List<Map<String, dynamic>>;
            final existing = guardians.where((row) => (row['user'] as Map)['email'] == guardianEmail);
            if (existing.isNotEmpty) {
              existing.first['relation'] = 'Admin';
            } else {
              guardians.add({
                'relation': 'Admin',
                'user': {'name': 'Second Adult', 'email': guardianEmail},
              });
            }
          case 'POST /api/v1/families/children':
            final body = Map<String, dynamic>.from(request.data as Map);
            if (body['kind'] == 'ADULT_INVITE' || body['kind'] == 'ADULT_CREATE') {
              adultRequests.add(body);
              final create = body['kind'] == 'ADULT_CREATE';
              statusCode = create ? 201 : 202;
              data = {'status': create ? 'ADDED' : 'PENDING'};
              break;
            }
            createdExplorer = Map<String, dynamic>.from(request.data as Map);
            (family['children'] as List).add({
              'id': 'teen',
              'name': createdExplorer!['name'],
              'birthYear': createdExplorer!['birthYear'],
              'ageBand': 'TEEN',
              'independentLogin': false,
            });
          case 'POST /api/v1/invites':
            sentInvite = Map<String, dynamic>.from(request.data as Map);
            data = {'id': 'invite-1', 'kind': 'FAMILY', 'email': sentInvite!['email']};
          case 'PUT /api/v1/auth/children/explorer/pin':
            savedPin = (request.data as Map)['pin'] as String;
        }
        handler.resolve(
          Response(requestOptions: request, data: data, statusCode: statusCode),
          true,
        );
      },
    ));
    await tester.pumpWidget(MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthSession>.value(value: session),
        Provider.value(value: FamilyService(api)),
        Provider.value(value: EngagementService(api)),
        Provider.value(value: AuthService(api, const FlutterSecureStorage())),
      ],
      child: const MaterialApp(home: FamilyScreen()),
    ));
    await tester.pumpAndSettle();

    // The family card is gone; editing lives only in the ⋮ menu.
    expect(find.byTooltip('Edit family'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('family-options')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Update family'));
    await tester.pumpAndSettle();
    final editFields = find.descendant(
      of: find.byType(AlertDialog),
      matching: find.byType(TextFormField),
    );
    await tester.enterText(editFields.at(0), '  Renamed family ');
    await tester.enterText(editFields.at(1), '');
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(family['name'], 'Renamed family');
    expect(family['description'], isNull);

    // Owners see "My family" as the title and a ⋮ options menu instead of "Add admin".
    expect(find.text('My family'), findsOneWidget);
    expect(find.text('Add admin'), findsNothing);
    Future<void> menu(String item) async {
      await tester.tap(find.byKey(const ValueKey('family-options')));
      await tester.pumpAndSettle();
      await tester.tap(find.text(item).last);
      await tester.pumpAndSettle();
    }

    await menu('Add guardian');
    final dialog = find.byType(AlertDialog);
    final add = find.descendant(of: dialog, matching: find.widgetWithText(FilledButton, 'Add guardian'));
    // The iPhone-style picker lists family members; the adult is preselected.
    expect(find.byKey(const ValueKey('admin-member-picker')), findsOneWidget);
    expect(find.descendant(of: find.byKey(const ValueKey('admin-member-picker')), matching: find.textContaining('Existing Adult')), findsOneWidget);
    await tester.tap(add);
    await tester.pumpAndSettle();
    expect(guardianEmail, 'existing@example.com');
    expect((family['guardians'] as List).first['relation'], 'Admin');

    await menu('Add guardian');
    // Only family members can be picked; there is no typing an email.
    expect(find.text('No family members aged 15 or over yet.'), findsOneWidget);
    expect(find.descendant(of: dialog, matching: find.byType(TextFormField)), findsNothing);
    expect(tester.widget<FilledButton>(add).onPressed, isNull);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();

    // Explorer actions live in the card's vertical-ellipsis menu; the PIN is set on its own screen.
    final options = find.byTooltip('Options for Rejoice');
    await tester.ensureVisible(options);
    await tester.tap(options);
    await tester.pumpAndSettle();
    expect(find.text('Send cheers'), findsNothing); // no cheer templates in this fixture
    expect(find.text('Request deletion'), findsOneWidget);
    await tester.tap(find.text('Set PIN'));
    await tester.pumpAndSettle();
    expect(find.text('PIN for Rejoice'), findsOneWidget);
    expect(find.text('Generate PIN'), findsNothing);
    await tester.enterText(find.widgetWithText(TextFormField, '4-digit PIN'), '2468');
    await tester.enterText(find.widgetWithText(TextFormField, 'Confirm PIN'), '2468');
    await tester.tap(find.text('Save PIN'));
    await tester.pumpAndSettle();
    expect(savedPin, '2468');

    // Add explorer opens a full screen.
    await menu('Add explorer');
    await tester.tap(find.text('Add youth explorer'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('explorer-name')), 'Maya');
    await tester.enterText(find.byKey(const ValueKey('explorer-age')), '16');
    await tester.pumpAndSettle();
    final teenEmail = find.byKey(const ValueKey('explorer-email'));
    await tester.tap(teenEmail);
    await tester.pumpAndSettle();
    expect(tester.testTextInput.setClientArgs?['inputType'],
        containsPair('name', 'TextInputType.emailAddress'));
    await tester.enterText(teenEmail, 'maya@example.com');
    await tester.enterText(find.byKey(const ValueKey('explorer-password')), 'teen-pass-123');
    await tester.tap(find.byKey(const ValueKey('save-explorer')));
    await tester.pumpAndSettle();
    expect(createdExplorer?.keys, unorderedEquals(['name', 'birthYear', 'email', 'password']));
    expect(createdExplorer?['name'], 'Maya');
    expect(find.text('My family'), findsOneWidget);

    // Under-15s are saved with the PIN the creator typed.
    await menu('Add explorer');
    await tester.tap(find.text('Add youth explorer'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const ValueKey('explorer-name')), 'Tobi');
    await tester.enterText(find.byKey(const ValueKey('explorer-age')), '7');
    await tester.pump();
    await tester.enterText(find.widgetWithText(TextFormField, '4-digit PIN'), '1357');
    await tester.enterText(find.widgetWithText(TextFormField, 'Confirm PIN'), '1357');
    await tester.tap(find.byKey(const ValueKey('save-explorer')));
    await tester.pumpAndSettle();
    expect(createdExplorer, containsPair('pin', '1357'));

    Future<void> adultOption(String label) async {
      await menu('Add explorer');
      await tester.tap(find.text('Add adult explorer'));
      await tester.pumpAndSettle();
      await tester.tap(find.text(label));
      await tester.pumpAndSettle();
    }

    await adultOption('Create adult profile');
    final year = DateTime.now().toUtc().year;
    await tester.enterText(find.widgetWithText(TextFormField, 'Name'), 'New Adult');
    await tester.enterText(find.widgetWithText(TextFormField, 'Birth year'), '${year - 19}');
    final adultEmail = find.widgetWithText(TextFormField, 'Email');
    await tester.enterText(adultEmail, 'new@example.com');
    await tester.tap(find.text('Add adult explorer'));
    await tester.pumpAndSettle();
    expect(find.text('Adult explorers must be 20 or older'), findsOneWidget);
    expect(adultRequests, isEmpty);
    await tester.enterText(find.widgetWithText(TextFormField, 'Birth year'), '${year - 20}');
    await tester.tap(find.text('Add adult explorer'));
    await tester.pumpAndSettle();
    expect(adultRequests.single, {
      'kind': 'ADULT_CREATE', 'email': 'new@example.com', 'name': 'New Adult', 'birthYear': year - 20,
    });
    expect(find.text('Adult explorer added. Password setup is pending.'), findsOneWidget);

    await adultOption('Invite existing account');
    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), 'existing@example.com');
    await tester.tap(find.text('Send invite'));
    await tester.pumpAndSettle();
    expect(adultRequests.last, {'kind': 'ADULT_INVITE', 'email': 'existing@example.com'});
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
    expect(find.text('Adult explorer invitation pending acceptance.'), findsOneWidget);

    // Invite guardian sends a family invite for this family to that account's email.
    await menu('Invite to family');
    await tester.enterText(find.byKey(const ValueKey('invite-guardian-email')), 'auntie@example.com');
    await tester.tap(find.text('Send invite'));
    await tester.pumpAndSettle();
    expect(sentInvite, {'kind': 'FAMILY', 'familyId': 'family-1', 'email': 'auntie@example.com'});

    // A 16-year-old appears in the guardian picker but cannot be chosen.
    await menu('Add guardian');
    expect(find.textContaining('Teen · admins must be 20+'), findsOneWidget);
    expect(find.text('Admins must be 20 or older.'), findsOneWidget);
    final addTeen = tester.widget<FilledButton>(find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(FilledButton, 'Add guardian')));
    expect(addTeen.onPressed, isNull);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
