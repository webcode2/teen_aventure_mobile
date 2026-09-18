# Teen Bible Adventures Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Flutter mobile app so student home and quiz match the WhatsApp “Teen Bible Adventures” mockups, then apply the same tokens to remaining screens.

**Architecture:** Replace `theme.dart` tokens with the mockup palette. Extract adventure chrome (header, logo, bottom nav) and home sections into focused widgets. Rebuild student home as an explorer dashboard and the objective quiz as the parchment quest screen. Keep teacher/parent flows in a drawer. Bottom nav maps to existing screens.

**Tech Stack:** Flutter, Provider, existing `GameController` / `SampleEpisodes`. No new backend.

## Global Constraints

- Palette hex values are fixed: navy `#173B5C`, cream `#FFF4DC`, orange `#E87524`, green `#2F7D5A`, gold `#F4B942`, teal `#159A9C`, heart empty `#704A2E`, correct fill `#E9F4EC`, answer fill `#FFFDF7`.
- Keep student, teacher, and parent role switching; do not delete those views.
- Do not commit unless the user asks.
- Do not invent friends/journal backends; those tiles navigate to existing screens or a short “coming soon” snackbar.
- `TeenAppTheme` aliases must keep working so untouched screens pick up the new palette.

## File map

- Modify: `mobile/lib/theme.dart` — new tokens + ThemeData
- Modify: `mobile/pubspec.yaml` — assets
- Create: `mobile/lib/widgets/adventure_logo.dart`
- Create: `mobile/lib/widgets/adventure_header.dart`
- Create: `mobile/lib/widgets/adventure_bottom_nav.dart`
- Create: `mobile/lib/widgets/explorer_hero.dart`
- Create: `mobile/lib/widgets/verse_blockquote.dart`
- Create: `mobile/lib/widgets/todays_quest_card.dart`
- Create: `mobile/lib/widgets/adventure_tools_grid.dart`
- Create: `mobile/lib/widgets/streak_banner.dart`
- Create: `mobile/lib/widgets/mascot_scene.dart`
- Create: `mobile/lib/screens/explorer_home_tab.dart`
- Modify: `mobile/lib/screens/home_screen.dart` — shell with drawer + bottom nav
- Modify: `mobile/lib/screens/objective_quiz_screen.dart` — parchment quiz
- Modify: `mobile/lib/models/puzzle.dart` — optional quiz explanation/verse
- Modify: `mobile/lib/data/episodes.dart` — Joshua quiz item matching mockup
- Create: `mobile/test/theme_tokens_test.dart`
- Create: `mobile/test/explorer_home_test.dart`
- Modify: `mobile/test/widget_test.dart` if the smoke test breaks

---

### Task 1: Theme tokens

**Files:**
- Modify: `mobile/lib/theme.dart`
- Create: `mobile/test/theme_tokens_test.dart`

**Interfaces:**
- Consumes: Flutter `material.dart`
- Produces: `AppColors` with mockup hex; `TeenAppTheme` aliases mapped onto those colors; `naturalTonesTheme` / `TeenAppTheme.themeData` using navy primary and orange secondary; `headerGradient` solid navy

- [ ] **Step 1: Write the failing token test**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/theme.dart';

void main() {
  test('AppColors match Teen Bible Adventures mockup palette', () {
    expect(AppColors.navy, const Color(0xFF173B5C));
    expect(AppColors.cream, const Color(0xFFFFF4DC));
    expect(AppColors.orange, const Color(0xFFE87524));
    expect(AppColors.forestGreen, const Color(0xFF2F7D5A));
    expect(AppColors.gold, const Color(0xFFF4B942));
    expect(AppColors.teal, const Color(0xFF159A9C));
    expect(AppColors.heartEmpty, const Color(0xFF704A2E));
    expect(AppColors.correctFill, const Color(0xFFE9F4EC));
    expect(AppColors.answerFill, const Color(0xFFFFFDF7));
  });

  test('TeenAppTheme aliases point at the adventure palette', () {
    expect(TeenAppTheme.deepPurple, AppColors.navy);
    expect(TeenAppTheme.violet, AppColors.orange);
    expect(TeenAppTheme.lavender, AppColors.cream);
    expect(TeenAppTheme.gold, AppColors.gold);
    expect(TeenAppTheme.freshGreen, AppColors.forestGreen);
    expect(TeenAppTheme.cream, AppColors.cream);
    expect(TeenAppTheme.midnight, AppColors.navy);
  });

  test('themeData uses navy primary and orange secondary', () {
    final scheme = TeenAppTheme.themeData.colorScheme;
    expect(scheme.primary, AppColors.navy);
    expect(scheme.secondary, AppColors.orange);
    expect(scheme.tertiary, AppColors.teal);
    expect(TeenAppTheme.themeData.scaffoldBackgroundColor, AppColors.cream);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/theme_tokens_test.dart` from `mobile/`
Expected: FAIL because `AppColors.navy` is not defined.

- [ ] **Step 3: Replace `theme.dart` with the adventure palette**

Keep `TeenAppTheme` names so existing screens compile. Map old sage/teal tokens onto the mockup colors.

```dart
import 'package:flutter/material.dart';

class AppColors {
  static const Color navy = Color(0xFF173B5C);
  static const Color cream = Color(0xFFFFF4DC);
  static const Color orange = Color(0xFFE87524);
  static const Color forestGreen = Color(0xFF2F7D5A);
  static const Color gold = Color(0xFFF4B942);
  static const Color teal = Color(0xFF159A9C);
  static const Color heartEmpty = Color(0xFF704A2E);
  static const Color correctFill = Color(0xFFE9F4EC);
  static const Color answerFill = Color(0xFFFFFDF7);

  // Backward-compatible names used across existing widgets
  static const Color sagePrimary = forestGreen;
  static const Color sageContainer = Color(0xFFE9F4EC);
  static const Color terracottaAccent = orange;
  static const Color terracottaContainer = Color(0xFFF8E7DF);
  static const Color puzzleTeal = teal;
  static const Color puzzleTealTint = Color(0xFFE6F6F6);
  static const Color amberGold = gold;
  static const Color solvedTile = Color(0xFFD9EBD4);
  static const Color background = cream;
  static const Color surface = Color(0xFFFFFDF7);
  static const Color surfaceVariant = Color(0xFFF6E7C8);
  static const Color border = Color(0xFFE6D7B8);
  static const Color borderDark = Color(0xFFD9C7A0);
  static const Color textPrimary = navy;
  static const Color textSecondary = Color(0xFF3E5A73);
  static const Color textMuted = Color(0xFF6B7C8A);
}

final ThemeData naturalTonesTheme = ThemeData(
  useMaterial3: true,
  scaffoldBackgroundColor: AppColors.cream,
  colorScheme: const ColorScheme(
    brightness: Brightness.light,
    primary: AppColors.navy,
    onPrimary: AppColors.cream,
    primaryContainer: AppColors.navy,
    onPrimaryContainer: AppColors.cream,
    secondary: AppColors.orange,
    onSecondary: Colors.white,
    secondaryContainer: Color(0xFFF8E7DF),
    onSecondaryContainer: AppColors.navy,
    tertiary: AppColors.teal,
    onTertiary: Colors.white,
    tertiaryContainer: Color(0xFFE6F6F6),
    onTertiaryContainer: AppColors.teal,
    surface: AppColors.surface,
    onSurface: AppColors.navy,
    surfaceVariant: AppColors.surfaceVariant,
    onSurfaceVariant: AppColors.textSecondary,
    outline: AppColors.border,
    outlineVariant: AppColors.borderDark,
    error: Color(0xFFBA1A1A),
    onError: Colors.white,
    errorContainer: Color(0xFFFFDAD6),
    onErrorContainer: Color(0xFF410E0B),
    surfaceContainerHighest: AppColors.surfaceVariant,
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: AppColors.navy,
    foregroundColor: AppColors.cream,
    elevation: 0,
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      backgroundColor: AppColors.orange,
      foregroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
  ),
);

class TeenAppTheme {
  static const Color deepPurple = AppColors.navy;
  static const Color violet = AppColors.orange;
  static const Color lavender = AppColors.cream;
  static const Color gold = AppColors.gold;
  static const Color freshGreen = AppColors.forestGreen;
  static const Color cream = AppColors.cream;
  static const Color midnight = AppColors.navy;

  static ThemeData get themeData => naturalTonesTheme;

  static BoxDecoration get headerGradient {
    return const BoxDecoration(color: AppColors.navy);
  }
}
```

- [ ] **Step 4: Run token tests**

Run: `flutter test test/theme_tokens_test.dart` from `mobile/`
Expected: PASS

---

### Task 2: Adventure chrome widgets

**Files:**
- Create: `mobile/lib/widgets/adventure_logo.dart`
- Create: `mobile/lib/widgets/adventure_header.dart`
- Create: `mobile/lib/widgets/adventure_bottom_nav.dart`
- Create: `mobile/lib/widgets/mascot_scene.dart`

**Interfaces:**
- Consumes: `AppColors`, `VoidCallback` for menu/bell
- Produces:
  - `AdventureLogo({double height = 44})`
  - `AdventureHeader({required VoidCallback onMenu, required VoidCallback onBell, int bellBadge = 3, Widget? trailing})`
  - `enum AdventureTab { home, bible, quests, rewards, profile }`
  - `AdventureBottomNav({required AdventureTab current, required ValueChanged<AdventureTab> onSelect})`
  - `MascotScene({double height = 168})`

- [ ] **Step 1: Implement logo, header, bottom nav, mascot scene**

Logo: stacked wordmark “Teen Bible” in cream, “Adventures” on an orange ribbon, tiny teal “Go Beyond the Stories” strip.

Header: navy bar, outlined rounded-square menu (or back via `trailing`/`leading`), centered logo, bell with orange badge.

Bottom nav: navy bar, five items. Active Home uses orange icon+label. Active Quests uses a teal circle around the compass. Rewards star is gold. Others cream.

Mascot scene: CustomPaint mountain range (cream/gold/green ridges) plus two labeled figures: Abi (green hoodie, Bible, green brush-stroke name) and Zach (orange shirt, map, orange name). No network images required.

- [ ] **Step 2: Widget-test header and nav labels**

Create `mobile/test/adventure_chrome_test.dart` that pumps header/nav inside `MaterialApp` and expects `Teen Bible Adventures`, Home/Bible/Quests/Rewards/Profile, and that tapping Quests calls `onSelect`.

- [ ] **Step 3: Run tests**

Run: `flutter test test/adventure_chrome_test.dart`
Expected: PASS

---

### Task 3: Explorer home sections

**Files:**
- Create: `mobile/lib/widgets/explorer_hero.dart`
- Create: `mobile/lib/widgets/verse_blockquote.dart`
- Create: `mobile/lib/widgets/todays_quest_card.dart`
- Create: `mobile/lib/widgets/adventure_tools_grid.dart`
- Create: `mobile/lib/widgets/streak_banner.dart`
- Create: `mobile/lib/screens/explorer_home_tab.dart`

**Interfaces:**
- `ExplorerHero({required int weekNumber, required int totalWeeks, required double progress})`
- `VerseBlockquote({required String text, required String reference})`
- `TodaysQuestCard({required String passage, required String subtitle, required int weekNumber, required VoidCallback onStart})`
- `AdventureToolsGrid({required VoidCallback onPuzzles, required VoidCallback onQuestMap, required VoidCallback onAchievements, required VoidCallback onJournal, required VoidCallback onFriends})`
- `StreakBanner({required int streakDays})`
- `ExplorerHomeTab` wires those widgets to `GameController` and existing navigators.

Copy:
- Greeting: `Hey, Explorer!` / `Ready for today's adventure in God's Word?`
- Verse: `Your word is a lamp to my feet and a light to my path.` / `Psalm 119:105`
- Quest default: `Joshua 1–4` / `Be Strong and Courageous`
- Tools: Bible Puzzles, Quest Map, Achievements, Journal, Friends
- Streak: `{n} Day Streak! Keep it going, Explorer!`

- [ ] **Step 1: Write explorer home widget test**

Pump `ExplorerHomeTab` with a `ChangeNotifierProvider<GameController>` and expect `Hey, Explorer!`, `Today's Quest`, `Your Adventure Tools`, `Start Reading`.

- [ ] **Step 2: Implement the section widgets and `ExplorerHomeTab`**

`ExplorerHomeTab` is a cream `SingleChildScrollView` stacking hero, verse, quest card, tools, streak. `Start Reading` opens `VideoLearningScreen` for the current week’s first video. Puzzles open `PuzzleScreen` (respect guardian lock). Achievements open `LeaderboardScreen`. Quest Map / Journal / Friends show a cream snackbar if no dedicated screen exists.

- [ ] **Step 3: Run tests**

Run: `flutter test test/explorer_home_test.dart`
Expected: PASS

---

### Task 4: Home shell with drawer and bottom nav

**Files:**
- Modify: `mobile/lib/screens/home_screen.dart`
- Modify: `mobile/test/widget_test.dart` if needed

**Interfaces:**
- `HomeScreen` owns `_tab` (`AdventureTab`) and a `Scaffold` with `AdventureHeader`, drawer (role switcher + teacher/parent shortcuts), body by tab, `AdventureBottomNav`.

Tab mapping:
- `home` → `ExplorerHomeTab` for student; existing teacher/parent dashboards when those roles are selected
- `bible` → current week video stack (`IosNotificationVideoStack` / student video list)
- `quests` → `ObjectiveQuizScreen` if guardian unlocked, else lock snackbar; puzzle tile remains on home tools
- `rewards` → embed or push `LeaderboardScreen` content
- `profile` → parent audit for parent role, teacher roster for teacher, simple student profile (score/gems/streak) otherwise

- [ ] **Step 1: Rebuild `HomeScreen` body to use header + explorer + bottom nav**

Remove the teal full-screen gradient chrome, mascot row, and in-body role segmented control from the student visual. Put the role switcher in an end/start `Drawer` opened by the hamburger.

Keep `_buildTeacherDashboardView` and `_buildParentGuardianView` and show them when those roles are active on the Home tab.

- [ ] **Step 2: Run app smoke test + explorer tests**

Run: `flutter test`
Expected: PASS

---

### Task 5: Parchment quiz screen

**Files:**
- Modify: `mobile/lib/models/puzzle.dart` (`QuizQuestion` optional `explanation`, `verseReference`)
- Modify: `mobile/lib/data/episodes.dart` (prepend Joshua mockup question)
- Modify: `mobile/lib/screens/objective_quiz_screen.dart`

**Interfaces:**
- `QuizQuestion` gains `final String? explanation` and `final String? verseReference` with defaults `null`.
- First sample question matches mockup: “What did God tell Joshua to be strong and courageous about?” with option C correct, verse `Joshua 1:7`.

Quiz UI:
- Navy header: back, `AdventureLogo`, coin chip (`⭐ 150` from `GameController.score` or gems)
- Quest line + segmented week bar + 3 hearts (2 filled orange, 1 outline)
- Parchment card: teal `Q{n}` chip, teal passage chip, bookmark, serif question, A–D rounded answers
- After submit correct: green banner “Correct!” + explanation + verse, `Read Verse` outline teal, `Next Question` orange
- Bottom `AdventureBottomNav` with `quests` selected

- [ ] **Step 1: Extend quiz model + sample data**

- [ ] **Step 2: Rebuild `ObjectiveQuizScreen` layout**

- [ ] **Step 3: Add `test/quiz_screen_test.dart` expecting `Q1`, option letters, and `Start Reading` is not required here — expect question text after pump.**

- [ ] **Step 4: Run `flutter test`**

Expected: PASS

---

### Task 6: Token polish on remaining screens

**Files:**
- Modify only if hardcoded old purple/teal hex remains: `video_learning_screen.dart`, `puzzle_screen.dart`, `offline_videos_screen.dart`, `parent_audit_screen.dart`, `teacher_*`, `leaderboard_screen.dart`, `stacked_video_card.dart`

Replace leftover hex like `0xFF2C1654`, `0xFF1E1035`, `0xFFF7F3FF` with `AppColors.navy` / `AppColors.cream`. AppBars already pick navy via `TeenAppTheme.deepPurple` after Task 1.

- [ ] **Step 1: Grep `lib/` for old hex (`#5A6D4B`, `0xFF027373`, `0xFF2C1654`, `0xFFF7F3FF`)**
- [ ] **Step 2: Replace with adventure tokens**
- [ ] **Step 3: Run `flutter analyze` and `flutter test`**

Expected: no errors; tests pass.

---

### Task 7: Visual verification

Flutter mobile cannot be verified in a web browser. Verify with:

```
cd mobile
flutter test
flutter analyze
```

If an emulator/device is available, run `flutter run` and check Home + Quiz against the three WhatsApp images: navy chrome, cream canvas, orange CTA, green streak/progress, teal tools/quest tab, gold rewards.

Report any remaining visual gaps (especially mascot illustrations vs 3D mockup art).
