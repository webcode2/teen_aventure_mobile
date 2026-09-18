# Explorer Home Vertical Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restack the explorer landing feed as a vertical week: three videos, then quiz, then puzzle, with Apple-like type and no duplicate weekly video-progress card.

**Architecture:** Keep `TodaysQuestCard` as the video tile. Replace the horizontal `PageView` pager with a vertical column in `TodaysQuestSlide`. Drop `CurrentlyActiveWeekCard` from home — `WeeklyQuestStreak` already lists Video 1–3 · Quiz · Puzzle. Point theme text at Cupertino typography (SF on iOS, SF-like metrics elsewhere) without adding a font package.

**Tech Stack:** Flutter, Provider, existing `GameController` / `SampleEpisodes`.

**Spec:** In-chat GAN planner brief (this change). No separate design doc.

## Global Constraints

- No new dependencies.
- Sequential video lock stays: cannot skip ahead.
- Quiz and puzzle stay locked until all three videos are done.
- Do not commit unless the user asks.

## File map

- Modify: `mobile/lib/theme.dart` — Cupertino text theme, slightly lighter default weights
- Modify: `mobile/lib/screens/teen/widgets/todays_quest_card.dart` — vertical list + quiz/puzzle rows
- Modify: `mobile/lib/screens/teen/explorer_home_tab.dart` — wire per-video / quiz / puzzle; remove progress card
- Modify: `mobile/lib/screens/teen/widgets/explorer_hero.dart` — drop serif, SF-like title
- Modify: `mobile/test/explorer_home_test.dart` — layout and lock assertions
- Modify: `mobile/test/theme_tokens_test.dart` — assert Cupertino platform typography if needed

---

### Task 1: Theme — Apple system type

**Files:**
- Modify: `mobile/lib/theme.dart`
- Test: `mobile/test/theme_tokens_test.dart`

- [x] Set `typography: Typography.material2021(platform: TargetPlatform.iOS)` and apply `Typography.blackCupertino` / `whiteCupertino` to `textTheme` / `primaryTextTheme`.
- [x] App bar titles use `FontWeight.w600`, letter-spacing slightly negative.
- [x] Run `flutter test test/theme_tokens_test.dart`

### Task 2: Vertical week list

**Files:**
- Modify: `mobile/lib/screens/teen/widgets/todays_quest_card.dart`
- Modify: `mobile/lib/screens/teen/explorer_home_tab.dart`
- Modify: `mobile/lib/screens/teen/widgets/explorer_hero.dart`
- Test: `mobile/test/explorer_home_test.dart`

- [x] `TodaysQuestSlide` becomes a `Column`: three video cards (16px gap), then 24px, quiz row, 12px, puzzle row. No `PageView`, no `1 / 3` pager.
- [x] `onOpenVideo(int index)`, `onQuiz`, `onPuzzle`. Quiz/puzzle locked when `completedCount < 3`.
- [x] Remove `CurrentlyActiveWeekCard` from home.
- [x] Tests: no PageView, no `Week video progress`, videos stacked (Y order), Quiz then Puzzle below Video 3, skip-ahead snackbar on locked video.

### Task 3: Verify

- [x] `flutter test test/explorer_home_test.dart test/theme_tokens_test.dart test/teen_quest_feed_test.dart`
