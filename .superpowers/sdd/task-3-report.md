# Task 3 Report: Show all five Home quest rows

## Status

**DONE**

## Summary

Replaced `TodaysQuestSlide`'s single `_nextStep()` card with `_rows(context)`, which always renders:

1. Video 1 hero `TodaysQuestCard` (key `home-video-0`)
2. Video 2 and 3 `AdventureListCard` rows when subtitles exist (keys `home-video-1`, `home-video-2`)
3. Quiz row (key `home-quiz`) — dimmed and snackbar when fewer than 3 videos complete
4. Puzzle row (key `home-puzzle`) — same lock behavior
5. Plain "You're caught up" text when `progress.isCaughtUp`

Added `_lockedTap` for quiz/puzzle lock messaging. Removed unused `_nextStep` and `_CaughtUpCard` (analyzer would flag unused class).

## Verification

```bash
cd mobile_ && dart analyze lib/screens/teen/widgets/todays_quest_card.dart lib/screens/teen/explorer_home_tab.dart
```

**Result:** Exit 0. No errors. Two pre-existing `prefer_const_constructors` info hints (explorer_home_tab, unrelated TodaysQuestCard line).

## Commit

| SHA | Subject |
|-----|---------|
| `ef2c234` | feat: show every home quest step, with quiz and puzzle locked |

Only `mobile_/lib/screens/teen/widgets/todays_quest_card.dart` was staged and committed.

## Self-review

### Spec compliance

- Build uses `..._rows(context)` verbatim per brief.
- `_rows` / `_lockedTap` match brief code (keys, labels, opacity 0.45, snackbar copy, caught-up text style).
- No changes to `GameController`, `WeekQuestFlow`, or video screen.

### Notes (non-blocking)

- **Opacity widgets:** Reviewer flagged `Opacity(0.45)` as a possible compositing cost on locked rows; brief specifies this pattern explicitly — left as-is.
- **Caught-up UX:** Replaced rich `_CaughtUpCard` with brief's minimal text line; intentional per task.
- **Snackbar copy:** Hardcodes "3 videos"; matches brief and aligns with `WeekQuestProgress.videoCount` (3).

### Manual test suggestions

- Home tab with 0 videos: see 5 rows, quiz/puzzle dimmed, snackbar on tap.
- After 3 videos: quiz/puzzle full opacity and callbacks fire.
- Fully caught up: extra "You're caught up" line at bottom.

## Concerns

None blocking task completion.
