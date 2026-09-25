# Home Quest Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show all three Home quest videos at once (one thumbnail, two play rows), keep quiz and puzzle visible until all three videos are watched, and drop the app-wide font bump from +3 to +1.

**Architecture:** `GameController` records each watched video index in a set. `WeekQuestFlow` opens a chosen video, the quiz, or the puzzle. `TodaysQuestSlide` always renders the five rows. The video screen returns to Home when a video ends. `openNext` stays only for the quiz Continue handoff.

**Tech Stack:** Flutter, `flutter_test`, existing `AdventureListCard` and `TodaysQuestCard`.

## Global Constraints

- Thumbnail is video 1 only, the existing thumbnail card. The large line stays the week passage. The smaller line is that video's title.
- Videos 2 and 3 use `AdventureListCard`, a play icon, and `VideoLesson.title`. No thumbnail on those rows.
- Any video can be played, including a rewatch.
- Quiz and puzzle are visible immediately. Both open only after all 3 videos are watched. They turn on together. Finishing the quiz is not required before the puzzle.
- Locked quiz tap shows `Finish all 3 videos to open the quiz.` and does not navigate.
- Locked puzzle tap shows `Finish all 3 videos to open the puzzle.` and does not navigate.
- Locked rows use opacity 0.45.
- After a video ends, return to Home. Do not open the next video, quiz, or puzzle.
- After the quiz ends, the existing handoff may still open the puzzle.
- `completeVideoPart` records that part index only and awards points once per index.
- `weekVideosDone` is how many of indexes 0, 1, and 2 are in the set.
- `completedVideoParts` stays the longest finished prefix (0, then 1, then 2).
- Rows use `SampleEpisodes.week1Package`.
- The five rows stay on screen. When all five steps are done, a short "You're caught up" line sits under the rows.
- `kAppFontBump` changes from 3 to 1. No other font sizes change.
- Do not change week-detail layout, family groups, or bottom-nav structure.

---

### Task 1: Record each watched video once

**Files:**
- Create: `mobile_/test/home_quest_progress_test.dart`
- Modify: `mobile_/lib/models/game_controller.dart:31-31` and `mobile_/lib/models/game_controller.dart:114-140`
- Test: `mobile_/test/home_quest_progress_test.dart`

**Interfaces:**
- Consumes: `GameController.completeVideoPart(int partIndex)`, `QuestPoints.video` (value 1), starting `score` 120
- Produces: `completedVideoParts` getter (longest prefix), `weekVideosDone` getter (count of indexes 0–2), `weekQuest` still built from `weekVideosDone`

- [ ] **Step 1: Write the failing test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/models/game_controller.dart';

void main() {
  test('watching video 3 first does not mark videos 1 and 2', () {
    final game = GameController();
    game.completeVideoPart(2);
    expect(game.completedVideoParts, 0);
    expect(game.weekVideosDone, 1);
    expect(game.score, 121);
  });

  test('the same video awards points once', () {
    final game = GameController();
    game.completeVideoPart(2);
    game.completeVideoPart(2);
    expect(game.weekVideosDone, 1);
    expect(game.score, 121);
  });

  test('three distinct videos open the quest count', () {
    final game = GameController();
    game.completeVideoPart(0);
    game.completeVideoPart(1);
    game.completeVideoPart(2);
    expect(game.completedVideoParts, 3);
    expect(game.weekVideosDone, 3);
    expect(game.weekQuest.videosCompleted, 3);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run from `mobile_`: `flutter test test/home_quest_progress_test.dart`

Expected: FAIL. `completedVideoParts` is 3 after `completeVideoPart(2)` because the current code treats the highest index as a finished prefix.

- [ ] **Step 3: Write minimal implementation**

In `mobile_/lib/models/game_controller.dart`, replace the `completedVideoParts` field:

```dart
  final Set<int> _watchedVideoParts = <int>{};

  /// Longest finished prefix: index 0, then 1, then 2.
  int get completedVideoParts {
    var prefix = 0;
    while (_watchedVideoParts.contains(prefix)) {
      prefix += 1;
    }
    return prefix;
  }
```

Replace `completeVideoPart` and `weekVideosDone`:

```dart
  void completeVideoPart(int partIndex) {
    if (partIndex < 0) return;
    if (!_watchedVideoParts.add(partIndex)) return;
    score += QuestPoints.video;
    gems += 1;
    notifyListeners();
  }

  int get weekVideosDone =>
      _watchedVideoParts.where((index) => index >= 0 && index < 3).length;
```

Leave `weekQuest` as it is. It already reads `weekVideosDone`.

- [ ] **Step 4: Run test to verify it passes**

Run from `mobile_`: `flutter test test/home_quest_progress_test.dart`

Expected: PASS. All three tests pass.

- [ ] **Step 5: Commit**

```bash
git add mobile_/test/home_quest_progress_test.dart mobile_/lib/models/game_controller.dart
git commit -m "$(cat <<'EOF'
fix: count each watched home video on its own

EOF
)"
```

---

### Task 2: Open a chosen video, quiz, or puzzle

**Files:**
- Modify: `mobile_/lib/screens/teen/week_quest_flow.dart`
- Modify: `mobile_/lib/screens/teen/video_learning_screen.dart:136-143`
- Modify: `mobile_/lib/screens/teen/explorer_home_tab.dart:77-79`

**Interfaces:**
- Consumes: `SampleEpisodes.week1Package`, `VideoLearningScreen`, `ObjectiveQuizScreen`, `PuzzleScreen`, `WeekQuestFlow.passage`
- Produces:
  - `static Future<void> openVideo(BuildContext context, int index)`
  - `static Future<void> openQuiz(BuildContext context)`
  - `static Future<void> openPuzzle(BuildContext context)`
  - `openNext` stays unchanged for the quiz Continue button

- [ ] **Step 1: Add the three openers**

In `mobile_/lib/screens/teen/week_quest_flow.dart`, add these methods on `WeekQuestFlow` next to `openNext`. Do not change `openNext` or `_nextPage`.

```dart
  static Future<void> openVideo(BuildContext context, int index) async {
    final pack = SampleEpisodes.week1Package;
    if (index < 0 || index >= pack.videos.length) return;
    await Navigator.push<void>(
      context,
      MaterialPageRoute(
        builder: (_) => VideoLearningScreen(
          lesson: pack.videos[index],
          weekLabel: 'Week ${pack.weekNumber} Quest',
          lessonTitle: passage,
        ),
      ),
    );
  }

  static Future<void> openQuiz(BuildContext context) async {
    await Navigator.push<void>(
      context,
      MaterialPageRoute(builder: (_) => const ObjectiveQuizScreen()),
    );
  }

  static Future<void> openPuzzle(BuildContext context) async {
    await Navigator.push<void>(
      context,
      MaterialPageRoute(builder: (_) => const PuzzleScreen()),
    );
  }
```

- [ ] **Step 2: Return Home when a video ends**

In `mobile_/lib/screens/teen/video_learning_screen.dart`, replace the end of `_finishAndContinue`:

```dart
    await _leaveVideoPlayback();
    if (!mounted) return;
    if (Navigator.canPop(context)) Navigator.pop(context);
```

Remove the `WeekQuestFlow.openNext(context, replace: true)` call from this method. If `week_quest_flow.dart` is then unused in this file, remove that import.

- [ ] **Step 3: Point Home taps at the chosen step**

In `mobile_/lib/screens/teen/explorer_home_tab.dart`, replace the three callbacks:

```dart
              onOpenVideo: (index) => WeekQuestFlow.openVideo(context, index),
              onQuiz: () => WeekQuestFlow.openQuiz(context),
              onPuzzle: () => WeekQuestFlow.openPuzzle(context),
```

- [ ] **Step 4: Analyze the three files**

Run from `mobile_`:

```bash
dart analyze lib/screens/teen/week_quest_flow.dart lib/screens/teen/video_learning_screen.dart lib/screens/teen/explorer_home_tab.dart
```

Expected: no errors. Infos that already existed may remain.

- [ ] **Step 5: Commit**

```bash
git add mobile_/lib/screens/teen/week_quest_flow.dart mobile_/lib/screens/teen/video_learning_screen.dart mobile_/lib/screens/teen/explorer_home_tab.dart
git commit -m "$(cat <<'EOF'
feat: open the home quest video the explorer picked

EOF
)"
```

---

### Task 3: Show all five Home quest rows

**Files:**
- Modify: `mobile_/lib/screens/teen/widgets/todays_quest_card.dart` (`TodaysQuestSlide._nextStep` and the call site in `build`)

**Interfaces:**
- Consumes: `onOpenVideo(int)`, `onQuiz`, `onPuzzle`, `progress.videosCompleted`, `progress.isCaughtUp`, `videoSubtitles`, `AdventureListCard`, `TodaysQuestCard`, `AppColors`
- Produces: a column of video 1 thumbnail, video 2 row, video 3 row, quiz row, puzzle row, and the caught-up line when `progress.isCaughtUp`

- [ ] **Step 1: Replace the single next-step card**

In `TodaysQuestSlide.build`, replace `const SizedBox(height: 16), _nextStep(),` with:

```dart
          const SizedBox(height: 16),
          ..._rows(context),
```

Delete `_nextStep`. Add `_rows` and `_lockedTap` on `TodaysQuestSlide`:

```dart
  List<Widget> _rows(BuildContext context) {
    final videosOpen = progress.videosCompleted >= WeekQuestProgress.videoCount;
    final rows = <Widget>[
      SizedBox(
        key: const ValueKey('home-video-0'),
        height: 178,
        child: TodaysQuestCard(
          label: 'Video 1',
          passage: passage,
          subtitle: videoSubtitles.isNotEmpty ? videoSubtitles[0] : 'Video 1',
          onStart: () => onOpenVideo(0),
        ),
      ),
    ];
    for (var index = 1; index < videoSubtitles.length && index < cardCount; index++) {
      rows.add(const SizedBox(height: 10));
      rows.add(
        AdventureListCard(
          key: ValueKey('home-video-$index'),
          icon: Icons.play_arrow_rounded,
          title: videoSubtitles[index],
          accent: AdventureListAccent.orange,
          onTap: () => onOpenVideo(index),
        ),
      );
    }
    rows.add(const SizedBox(height: 10));
    rows.add(
      Opacity(
        opacity: videosOpen ? 1 : 0.45,
        child: AdventureListCard(
          key: const ValueKey('home-quiz'),
          icon: Icons.quiz_rounded,
          title: 'Quiz',
          subtitle: 'Objective questions for this week.',
          accent: AdventureListAccent.navy,
          onTap: videosOpen ? onQuiz : () => _lockedTap(context, puzzle: false),
        ),
      ),
    );
    rows.add(const SizedBox(height: 10));
    rows.add(
      Opacity(
        opacity: videosOpen ? 1 : 0.45,
        child: AdventureListCard(
          key: const ValueKey('home-puzzle'),
          icon: Icons.extension_rounded,
          title: 'Puzzle',
          subtitle: 'Bible puzzle adventure for this week.',
          accent: AdventureListAccent.teal,
          onTap: videosOpen ? onPuzzle : () => _lockedTap(context, puzzle: true),
        ),
      ),
    );
    if (progress.isCaughtUp) {
      rows.add(const SizedBox(height: 12));
      rows.add(
        const Text(
          "You're caught up",
          style: TextStyle(
            color: AppColors.navy,
            fontWeight: FontWeight.w700,
            fontSize: 15,
          ),
        ),
      );
    }
    return rows;
  }

  void _lockedTap(BuildContext context, {required bool puzzle}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          puzzle
              ? 'Finish all 3 videos to open the puzzle.'
              : 'Finish all 3 videos to open the quiz.',
        ),
        backgroundColor: AppColors.navy,
      ),
    );
  }
```

`WeekQuestProgress` is already imported by this file. Keep `_CaughtUpCard` in the file even if nothing calls it, only if the analyzer does not flag it. If the analyzer reports it unused, delete the class.

- [ ] **Step 2: Analyze the widget**

Run from `mobile_`:

```bash
dart analyze lib/screens/teen/widgets/todays_quest_card.dart lib/screens/teen/explorer_home_tab.dart
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile_/lib/screens/teen/widgets/todays_quest_card.dart
git commit -m "$(cat <<'EOF'
feat: show every home quest step, with quiz and puzzle locked

EOF
)"
```

---

### Task 4: Drop the app-wide font bump to +1

**Files:**
- Modify: `mobile_/lib/theme.dart` (`kAppFontBump`)
- Modify: `mobile_/test/home_quest_progress_test.dart`

**Interfaces:**
- Consumes: `kAppFontBump` in `mobile_/lib/theme.dart`
- Produces: `kAppFontBump == 1`

- [ ] **Step 1: Write the failing expectation**

Add this import and test to `mobile_/test/home_quest_progress_test.dart`:

```dart
import 'package:teen_aventure/theme.dart';
```

```dart
  test('app font bump is one point', () {
    expect(kAppFontBump, 1);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run from `mobile_`: `flutter test test/home_quest_progress_test.dart`

Expected: FAIL. `kAppFontBump` is 3.

- [ ] **Step 3: Set the bump**

In `mobile_/lib/theme.dart`:

```dart
const double kAppFontBump = 1;
```

Do not change `kAppTextScale` or any `fontSize` literal.

- [ ] **Step 4: Run test to verify it passes**

Run from `mobile_`: `flutter test test/home_quest_progress_test.dart`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile_/lib/theme.dart mobile_/test/home_quest_progress_test.dart
git commit -m "$(cat <<'EOF'
fix: reduce the app-wide font bump to one point

EOF
)"
```
