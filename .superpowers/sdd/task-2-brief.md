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

