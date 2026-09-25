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

