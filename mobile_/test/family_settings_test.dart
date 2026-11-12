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
      'family owner edits details, adds a guardian, and generates a PIN',
      (tester) async {
    SharedPreferences.setMockInitialValues({});
    final api = await ApiClient.create();
    final session =
        AuthSession.test(authenticated: true, shell: AppShell.parent)
          ..userId = 'owner';
    final family = <String, dynamic>{
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
    api.dio.interceptors.add(InterceptorsWrapper(
      onRequest: (request, handler) {
        final route = '${request.method} ${request.path}';
        Object data = <String, dynamic>{};
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
            createdExplorer = Map<String, dynamic>.from(request.data as Map);
            (family['children'] as List).add({
              'id': 'teen',
              'name': createdExplorer!['name'],
              'birthYear': createdExplorer!['birthYear'],
              'ageBand': 'TEEN',
              'independentLogin': false,
            });
          case 'PUT /api/v1/auth/children/explorer/pin':
            savedPin = (request.data as Map)['pin'] as String;
        }
        handler.resolve(
          Response(requestOptions: request, data: data, statusCode: 200),
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

    await tester.tap(find.byTooltip('Edit family'));
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
    expect(find.text('Renamed family'), findsOneWidget);

    // The action lives in the Family top bar.
    await tester.tap(find.widgetWithText(TextButton, 'Add admin'));
    await tester.pumpAndSettle();
    final dialog = find.byType(AlertDialog);
    final add = find.descendant(
        of: dialog,
        matching: find.widgetWithText(FilledButton, 'Add family admin'));
    // The iPhone-style picker lists family members; the adult is preselected.
    expect(find.byKey(const ValueKey('admin-member-picker')), findsOneWidget);
    expect(find.descendant(of: find.byKey(const ValueKey('admin-member-picker')), matching: find.textContaining('Existing Adult')), findsOneWidget);
    await tester.tap(add);
    await tester.pumpAndSettle();
    expect(guardianEmail, 'existing@example.com');
    expect((family['guardians'] as List).first['relation'], 'Admin');

    // The action lives in the Family top bar.
    await tester.tap(find.widgetWithText(TextButton, 'Add admin'));
    await tester.pumpAndSettle();
    // Only family members can be picked; there is no typing an email.
    expect(find.text('No family members aged 15 or over yet.'), findsOneWidget);
    expect(find.text('Add by email'), findsNothing);
    expect(find.descendant(of: dialog, matching: find.byType(TextFormField)), findsNothing);
    expect(tester.widget<FilledButton>(add).onPressed, isNull);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();

    // Explorer actions live in the card's vertical-ellipsis menu.
    final options = find.byTooltip('Options for Rejoice');
    await tester.ensureVisible(options);
    await tester.tap(options);
    await tester.pumpAndSettle();
    expect(find.text('Request deletion of Rejoice'), findsNothing);
    expect(find.text('Send cheers'), findsNothing); // no cheer templates in this fixture
    expect(find.text('Request deletion'), findsOneWidget);
    await tester.tap(find.text('Set PIN'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Generate PIN'));
    await tester.pumpAndSettle();
    final field = tester.widget<EditableText>(
      find.descendant(of: dialog, matching: find.byType(EditableText)),
    );
    final generated = field.controller.text;
    expect(generated, matches(RegExp(r'^\d{4}$')));
    expect(field.obscureText, isFalse);
    expect(savedPin, isNull);
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(savedPin, generated);

    final next = find.widgetWithText(FilledButton, 'Next');
    await tester.ensureVisible(find.widgetWithText(TextField, 'Child/teen name'));
    await tester.enterText(find.widgetWithText(TextField, 'Child/teen name'), 'Maya');
    await tester.ensureVisible(next);
    await tester.tap(next);
    await tester.pumpAndSettle();
    final age = find.widgetWithText(TextField, 'Age');
    await tester.ensureVisible(age);
    await tester.tap(age);
    await tester.pumpAndSettle();
    await tester.enterText(age, '16');
    expect(tester.testTextInput.isVisible, isTrue);
    await tester.ensureVisible(next);
    await tester.tap(next);
    await tester.pumpAndSettle();
    final teenEmail = find.widgetWithText(TextField, 'Email (optional)');
    expect(tester.testTextInput.isVisible, isFalse);
    await tester.ensureVisible(teenEmail);
    await tester.tap(teenEmail);
    await tester.pumpAndSettle();
    expect(tester.testTextInput.isVisible, isTrue);
    expect(tester.testTextInput.setClientArgs?['inputType'],
        containsPair('name', 'TextInputType.emailAddress'));
    final create = find.widgetWithText(FilledButton, 'Create explorer');
    await tester.ensureVisible(create);
    await tester.tap(create);
    await tester.pumpAndSettle();
    expect(createdExplorer?.keys, unorderedEquals(['name', 'birthYear']));
    expect(createdExplorer?['name'], 'Maya');
    expect(find.byIcon(Icons.more_vert), findsNWidgets(2));

    // A 16-year-old appears in the admin picker but cannot be chosen.
    await tester.tap(find.widgetWithText(TextButton, 'Add admin'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Teen · admins must be 20+'), findsOneWidget);
    expect(find.text('Admins must be 20 or older.'), findsOneWidget);
    final addTeen = tester.widget<FilledButton>(find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(FilledButton, 'Add family admin')));
    expect(addTeen.onPressed, isNull);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
