# Task 1 Report: Record each watched video once

## Status

**DONE_WITH_CONCERNS** — Implementation and tests match the task brief; two follow-ups noted for later home-quest tasks (not in scope for Task 1).

## What was implemented

- Replaced the mutable `completedVideoParts` counter with a private `_watchedVideoParts` set.
- Added `completedVideoParts` getter that returns the longest finished prefix (0, then 1, then 2).
- Updated `completeVideoPart` to award score/gems only on first watch per index; ignores negative indices.
- Updated `weekVideosDone` to count distinct watched indexes in `[0, 2]`.
- Left `weekQuest` unchanged (still uses `weekVideosDone`).

## Files changed

| File | Action |
|------|--------|
| `mobile_/test/home_quest_progress_test.dart` | Created |
| `mobile_/lib/models/game_controller.dart` | Modified |

## TDD evidence

### RED (Step 2)

Command:

```bash
cd mobile_ && flutter test test/home_quest_progress_test.dart
```

Output (excerpt):

```
00:00 +0 -1: watching video 3 first does not mark videos 1 and 2 [E]
  Expected: <0>
    Actual: <3>

00:00 +0 -2: the same video awards points once [E]
  Expected: <1>
    Actual: <3>

00:00 +1 -2: Some tests failed.
```

Matches brief expectation: `completedVideoParts` was 3 after `completeVideoPart(2)` under the old highest-index-as-prefix behavior.

### GREEN (Step 4)

Command:

```bash
cd mobile_ && flutter test test/home_quest_progress_test.dart
```

Output:

```
00:00 +3: All tests passed!
```

Re-run before commit: same command, same result (3/3 pass).

## Commit

- **SHA:** `f1e20f8`
- **Subject:** fix: count each watched home video on its own
- Only the two task files were staged; other working-tree edits were left unstaged.

## Self-review

- **Requirements:** All three brief tests pass; interfaces match spec (`QuestPoints.video`, starting score 120, getters as named).
- **Idempotency:** `Set.add` guard prevents double scoring on the same index.
- **Prefix vs count:** Out-of-order watch (e.g. index 2 only) yields `completedVideoParts == 0` and `weekVideosDone == 1`, as required.
- **Call sites:** `completedVideoParts` remains a readable getter; no assignments to the old field elsewhere in the repo.
- **Flutter reviewer notes (informational):**
  1. No upper bound on `partIndex` in `completeVideoPart` — indices ≥ 3 could still award points without affecting `weekVideosDone`. Not specified in Task 1; consider a guard in a later task if the API should only accept 0–2.
  2. `weekQuest` still passes `weekVideosDone` into `WeekQuestProgress`, while `nextVideoIndex` is positional — out-of-order watching may desync “next video” UI until a later task wires prefix-based navigation. Brief explicitly said to leave `weekQuest` as-is.

## Concerns

1. **Out-of-range `partIndex`:** Not rejected for `partIndex >= 3`; could inflate score/gems without quest progress.
2. **`weekQuest.nextVideoIndex` vs out-of-order watches:** Intentionally deferred per brief; later Home quest layout tasks should align navigation with `completedVideoParts` or equivalent.

## Verification command (from brief)

```bash
cd mobile_ && flutter test test/home_quest_progress_test.dart
```

Expected: PASS (3 tests).
