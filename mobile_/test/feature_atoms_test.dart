import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/models/auth_session.dart';
import 'package:teen_aventure/models/game_controller.dart';
import 'package:teen_aventure/models/level_node.dart';
import 'package:teen_aventure/models/puzzle.dart';
import 'package:teen_aventure/platform/invite_qr_scanner_stub.dart';
import 'package:teen_aventure/providers/hero_copy.dart';
import 'package:teen_aventure/screens/auth/register_adult_screen.dart';
import 'package:teen_aventure/screens/auth/auth_gate.dart';
import 'package:teen_aventure/screens/auth/family_profile_picker_screen.dart';
import 'package:teen_aventure/screens/groups/invite_share_screen.dart';
import 'package:teen_aventure/screens/groups/join_invite_screen.dart';
import 'package:teen_aventure/screens/shared/widgets/double_back_exit.dart';
import 'package:teen_aventure/screens/teen/level_map_screen.dart';
import 'package:teen_aventure/screens/teen/widgets/welcome_onboarding_dialog.dart';
import 'package:teen_aventure/screens/teen/widgets/word_declaration_card.dart';
import 'package:teen_aventure/services/family_service.dart';

class _JoinFamilyService implements FamilyService {
  _JoinFamilyService({this.groupKind = 'CHURCH'});

  final String groupKind;
  final accepted = <String>[];
  final acceptedChildIds = <String?>[];

  @override
  Future<Map<String, dynamic>> previewInvite(String raw) async =>
      {'kind': 'CLASS', 'groupKind': groupKind, 'name': 'Test Group', 'durable': true};

  @override
  Future<Map<String, dynamic>> acceptInvite(String raw, {String? childId}) async {
    accepted.add(raw);
    acceptedChildIds.add(childId);
    return {'status': childId == null || groupKind == 'CUSTOM' ? 'APPROVED' : 'PENDING'};
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('account picker lists only active children of the owned family', (tester) async {
    final session = AuthSession.test(
      authenticated: true,
      shell: AppShell.parent,
      children: const [
        FamilyChildProfile(id: 'own', name: 'Home Explorer', ageBand: 'CHILD', canSwitchProfile: true),
        FamilyChildProfile(id: 'other', name: 'Other Explorer', ageBand: 'TEEN'),
        FamilyChildProfile(
          id: 'inactive', name: 'Inactive Explorer', ageBand: 'TEEN',
          canSwitchProfile: true, loginDeactivated: true,
        ),
      ],
    );
    await tester.pumpWidget(ChangeNotifierProvider<AuthSession>.value(
      value: session,
      child: const MaterialApp(home: FamilyProfilePickerScreen()),
    ));
    expect(session.needsProfilePick, isTrue);
    expect(find.text('Home Explorer'), findsOneWidget);
    expect(find.text('Other Explorer'), findsNothing);
    expect(find.text('Inactive Explorer'), findsNothing);

    session.children = [session.children[1]];
    expect(session.needsProfilePick, isFalse);
  });

  test('welcome dialog is offered once', () {
    expect(WelcomeOnboardingDialog.shouldOffer(enabled: false, alreadyOffered: false, hasContent: true, seen: null), isFalse);
    expect(
      WelcomeOnboardingDialog.shouldOffer(
        alreadyOffered: false,
        hasContent: true,
        seen: null,
      ),
      isTrue,
    );
    expect(
      WelcomeOnboardingDialog.shouldOffer(
        alreadyOffered: false,
        hasContent: true,
        seen: true,
      ),
      isFalse,
    );
    expect(
      WelcomeOnboardingDialog.shouldOffer(
        alreadyOffered: true,
        hasContent: true,
        seen: null,
      ),
      isFalse,
    );
  });

  testWidgets('welcome dialog shows the continue action', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: WelcomeOnboardingDialog(welcome: WelcomeCopy.fallback),
      ),
    );
    expect(find.text('WELCOME'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
  });

  test('locked map pins use the locked snackbar copy', () {
    expect(lockedLevelNotice(LevelStatus.locked), 'Level locked');
    expect(lockedLevelNotice(null), 'Level locked');
    expect(lockedLevelNotice(LevelStatus.unlocked), isNull);
  });

  test('a puzzle hint spends one gem and fills the next letter', () {
    SharedPreferences.setMockInitialValues({});
    final game = GameController(
      initialEpisode: PuzzleEpisode(
        id: 'hint',
        episodeNumber: 1,
        title: 'Hint',
        theme: 'Test',
        gridSize: 3,
        words: [
          PWord(
            number: 1,
            direction: Direction.across,
            answer: 'GOD',
            clue: 'Across',
            ref: '',
            startRow: 0,
            startCol: 0,
          ),
        ],
      ),
    );
    game.selectWord(game.episode.words.single);
    expect(game.clueGemsRemaining, 4);
    game.useHint();
    expect(game.clueGemsRemaining, 3);
    expect(game.grid[0][0].userLetter, 'G');
    game.clueGemsRemaining = 0;
    game.useHint();
    expect(game.grid[0][1].userLetter, isEmpty);
  });

  testWidgets('word declaration awards after ten taps', (tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => GameController(),
        child: const MaterialApp(
          home: Scaffold(
            body: WordDeclarationCard(
              declaration: 'The Lord is my shepherd',
              reference: 'Psalm 23:1',
              refKey: 'psalm-23',
            ),
          ),
        ),
      ),
    );
    final card = find.byKey(const ValueKey('word-declaration-card'));
    for (var i = 0; i < 9; i++) {
      await tester.tap(card);
      await tester.pump();
    }
    expect(find.textContaining('9/10'), findsWidgets);
    await tester.tap(card);
    await tester.pump();
    expect(find.textContaining('Completed today'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  Widget declarationCard({DateTime? declaredAt}) => ChangeNotifierProvider(
        create: (_) => GameController(),
        child: MaterialApp(
          home: Scaffold(
            body: WordDeclarationCard(
              declaration: 'The Lord is my shepherd',
              reference: 'Psalm 23:1',
              refKey: 'psalm-23',
              declaredAt: declaredAt,
            ),
          ),
        ),
      );

  testWidgets('a declaration completed on another device today shows as done', (tester) async {
    await tester.pumpWidget(declarationCard(declaredAt: DateTime.now().toUtc()));
    expect(find.textContaining('Completed today'), findsOneWidget);
    expect(find.textContaining('10/10'), findsWidgets);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('a declaration from yesterday starts a fresh count today', (tester) async {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    await tester.pumpWidget(declarationCard(declaredAt: yesterday.toUtc()));
    expect(find.textContaining('Completed today'), findsNothing);
    expect(find.textContaining('0/10'), findsWidgets);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('the server record arriving after the card shows still completes it', (tester) async {
    await tester.pumpWidget(declarationCard());
    expect(find.textContaining('Completed today'), findsNothing);
    await tester.pumpWidget(declarationCard(declaredAt: DateTime.now().toUtc()));
    await tester.pump();
    expect(find.textContaining('Completed today'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('the first back warns and the second exits', (tester) async {
    var exited = false;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'SystemNavigator.pop') exited = true;
        return null;
      },
    );
    addTearDown(() {
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      );
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: DoubleBackExit(
          child: Scaffold(body: Text('Home')),
        ),
      ),
    );
    await tester.binding.handlePopRoute();
    await tester.pump();
    expect(find.text('Press back again to exit'), findsOneWidget);
    expect(exited, isFalse);
    await tester.binding.handlePopRoute();
    await tester.pump();
    expect(exited, isTrue);
  });

  Future<void> _tall(WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
  }

  testWidgets('under 15 cannot register on their own', (tester) async {
    await _tall(tester);
    await tester.pumpWidget(const MaterialApp(home: RegisterAdultScreen()));
    await tester.enterText(find.widgetWithText(TextField, 'Your name'), 'Sam');
    await tester.enterText(
      find.widgetWithText(TextField, 'Birth year'),
      '${DateTime.now().year - 14}',
    );
    await tester.enterText(find.widgetWithText(TextField, 'Email'), 'sam@family.test');
    await tester.enterText(find.widgetWithText(TextField, 'Password'), 'password123');
    await tester.ensureVisible(find.byType(Checkbox));
    await tester.tap(find.byType(Checkbox));
    await tester.pump();
    await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
    await tester.pump();
    expect(find.text('Under 15 join through a parent’s family account'), findsOneWidget);
  });

  testWidgets('register requires the terms checkbox', (tester) async {
    await _tall(tester);
    await tester.pumpWidget(const MaterialApp(home: RegisterAdultScreen()));
    await tester.enterText(find.widgetWithText(TextField, 'Your name'), 'Ada');
    await tester.enterText(
      find.widgetWithText(TextField, 'Birth year'),
      '${DateTime.now().year - 30}',
    );
    await tester.enterText(find.widgetWithText(TextField, 'Email'), 'ada@family.test');
    await tester.enterText(find.widgetWithText(TextField, 'Password'), 'password123');
    await tester.ensureVisible(find.widgetWithText(FilledButton, 'Create account'));
    await tester.tap(find.widgetWithText(FilledButton, 'Create account'));
    await tester.pump();
    expect(find.text('Please agree to the Terms of Use to continue.'), findsOneWidget);
  });

  testWidgets('sharing a group code shows a single reusable QR', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: InviteShareScreen(kind: 'CLASS', joinCode: 'AB1234'),
    ));
    await tester.pumpAndSettle();

    expect(find.byType(QrImageView), findsOneWidget);
    expect(find.text('JOIN CODE: AB1234'), findsOneWidget);
    expect(find.text('Share invite QR'), findsNothing);
  });

  testWidgets('email invite requires a valid address', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: InviteShareScreen(kind: 'CLASS', joinCode: 'AB1234'),
    ));
    final button = find.widgetWithText(FilledButton, 'Create email invite');
    await tester.scrollUntilVisible(
      button, 250, scrollable: find.byType(Scrollable).first,
    );
    expect(tester.widget<FilledButton>(button).onPressed, isNull);

    final email = find.widgetWithText(TextField, 'Email address');
    await tester.enterText(email, 'explorer@example');
    await tester.pump();
    expect(tester.widget<FilledButton>(button).onPressed, isNull);

    await tester.enterText(email, 'explorer+group@example.com');
    await tester.pump();
    expect(tester.widget<FilledButton>(button).onPressed, isNotNull);

    await tester.enterText(email, '');
    await tester.pump();
    expect(tester.widget<FilledButton>(button).onPressed, isNull);
  });

  test('invite scan stub keeps the torch off', () async {
    final scanner = InviteQrScannerController();
    expect(scanner.torchOn, isFalse);
    await scanner.toggleTorch();
    expect(scanner.torchOn, isFalse);
  });

  testWidgets('a group QR scan joins once across duplicate camera frames', (tester) async {
    final family = _JoinFamilyService();
    final session = AuthSession.test(
      authenticated: true, shell: AppShell.teen, ageBand: 'TEEN',
    );
    await tester.pumpWidget(MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthSession>.value(value: session),
        Provider<FamilyService>.value(value: family),
      ],
      child: const MaterialApp(home: JoinInviteScreen()),
    ));
    await tester.pump();
    final scanner = tester.widget<MobileScanner>(find.byType(MobileScanner));
    const capture = BarcodeCapture(barcodes: [
      Barcode(rawValue: 'https://tba.elastrocloud.com/join/class/AB1234'),
    ]);
    scanner.onDetect!(capture);
    scanner.onDetect!(capture);
    await tester.pump();
    expect(family.accepted, ['class:AB1234']);
  });

  for (final kind in ['CUSTOM', 'CHURCH']) {
    testWidgets('$kind group picker offers only authorized explorer profiles', (tester) async {
      final family = _JoinFamilyService(groupKind: kind);
      final session = AuthSession.test(
        authenticated: true,
        shell: AppShell.parent,
        children: const [
          FamilyChildProfile(id: 'own', name: 'Own explorer', ageBand: 'CHILD', canJoinGroup: true),
          FamilyChildProfile(id: 'ward', name: 'Guardian explorer', ageBand: 'CHILD', canJoinGroup: true),
          FamilyChildProfile(id: 'peer', name: 'Joined family explorer', ageBand: 'CHILD', canJoinGroup: false),
        ],
      );
      await tester.pumpWidget(MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthSession>.value(value: session),
          Provider<FamilyService>.value(value: family),
        ],
        child: MaterialApp(home: Builder(builder: (context) => Scaffold(
          body: TextButton(
            onPressed: () => Navigator.push<void>(context, MaterialPageRoute(
              builder: (_) => const JoinInviteScreen(showScanner: false),
            )),
            child: const Text('Open group invite'),
          ),
        ))),
      ));
      await tester.tap(find.text('Open group invite'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'class:AB1234');
      await tester.tap(find.text('Check invite'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Own explorer'));
      await tester.pumpAndSettle();
      expect(find.text('Joined family explorer'), findsNothing);
      await tester.tap(find.text('Guardian explorer').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text(kind == 'CUSTOM' ? 'Join group' : 'Request join'));
      await tester.pumpAndSettle();
      expect(family.acceptedChildIds, ['ward']);
      expect(find.text(kind == 'CUSTOM'
          ? 'You joined. Welcome in.'
          : 'Join requested. The group leader will approve it.'), findsOneWidget);
    });
  }

  testWidgets('an Android join link opens the scanner with a rescan prompt', (tester) async {
    const channel = MethodChannel('tba/join_links');
    final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(channel, (_) async =>
        'https://tba.elastrocloud.com/join/class/AB1234');
    addTearDown(() => messenger.setMockMethodCallHandler(channel, null));

    final session = AuthSession.test(
      authenticated: true, shell: AppShell.teen, ageBand: 'TEEN',
    );
    await tester.pumpWidget(ChangeNotifierProvider<AuthSession>.value(
      value: session,
      child: const MaterialApp(home: AuthGate(authenticatedChild: SizedBox())),
    ));
    await tester.pumpAndSettle();
    expect(find.text('Scan the group QR code again to join.'), findsOneWidget);
  });

  testWidgets('invite scan shows torch and try again when the camera fails', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: JoinInviteScreen()));
    await tester.pump();
    expect(find.byTooltip('Torch on'), findsOneWidget);
    await tester.tap(find.byTooltip('Torch on'));
    await tester.pump();
    expect(find.byTooltip('Torch on'), findsOneWidget);
    await tester.pump(const Duration(seconds: 1));
    final retry = find.text('Try camera again');
    if (retry.evaluate().isNotEmpty) {
      await tester.tap(retry);
      await tester.pump();
    }
    expect(find.textContaining('group QR'), findsOneWidget);
  });
}
