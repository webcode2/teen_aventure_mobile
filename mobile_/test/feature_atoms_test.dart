import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/models/game_controller.dart';
import 'package:teen_aventure/models/level_node.dart';
import 'package:teen_aventure/models/puzzle.dart';
import 'package:teen_aventure/platform/invite_qr_scanner_stub.dart';
import 'package:teen_aventure/providers/hero_copy.dart';
import 'package:teen_aventure/screens/auth/register_adult_screen.dart';
import 'package:teen_aventure/screens/groups/join_invite_screen.dart';
import 'package:teen_aventure/screens/shared/widgets/double_back_exit.dart';
import 'package:teen_aventure/screens/teen/level_map_screen.dart';
import 'package:teen_aventure/screens/teen/widgets/welcome_onboarding_dialog.dart';
import 'package:teen_aventure/screens/teen/widgets/word_declaration_card.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

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
    expect(game.gems, 4);
    game.useHint();
    expect(game.gems, 3);
    expect(game.grid[0][0].userLetter, 'G');
    game.gems = 0;
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

  test('invite scan stub keeps the torch off', () async {
    final scanner = InviteQrScannerController();
    expect(scanner.torchOn, isFalse);
    await scanner.toggleTorch();
    expect(scanner.torchOn, isFalse);
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
    expect(find.textContaining('invite QR'), findsOneWidget);
  });
}
