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

    await tester.ensureVisible(find.text('Add family admin'));
    await tester.tap(find.text('Add family admin'));
    await tester.pumpAndSettle();
    final dialog = find.byType(AlertDialog);
    final add = find.descendant(
        of: dialog,
        matching: find.widgetWithText(FilledButton, 'Add family admin'));
    await tester.tap(add);
    await tester.pumpAndSettle();
    expect(find.text('Select a family member'), findsOneWidget);
    await tester.tap(find.byType(DropdownButtonFormField<String>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Existing Adult').last);
    await tester.pumpAndSettle();
    await tester.tap(add);
    await tester.pumpAndSettle();
    expect(guardianEmail, 'existing@example.com');
    expect((family['guardians'] as List).first['relation'], 'Admin');

    await tester.ensureVisible(find.text('Add family admin'));
    await tester.tap(find.text('Add family admin'));
    await tester.pumpAndSettle();
    expect(find.byType(DropdownButtonFormField<String>), findsNothing);
    await tester.tap(find.text('Add by email'));
    await tester.pumpAndSettle();
    await tester.tap(add);
    await tester.pumpAndSettle();
    expect(find.text('Email is required'), findsOneWidget);
    await tester.enterText(
        find.descendant(of: dialog, matching: find.byType(TextFormField)),
        ' Adult@Example.com ');
    await tester.tap(add);
    await tester.pumpAndSettle();
    expect(guardianEmail, 'adult@example.com');
    expect(find.text('Second Adult'), findsOneWidget);

    final setPin = find.text('Set PIN');
    await tester.ensureVisible(setPin);
    await tester.tap(setPin);
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
    expect(find.text('Set PIN'), findsNWidgets(2));
    expect(tester.takeException(), isNull);
  });
}
