# Task 4 Report: Drop the app-wide font bump to +1

## Status

**DONE_WITH_CONCERNS** — `kAppFontBump` is `1`, test passes, commit scoped to the constant + test. Unstaged `mobile_/lib/theme.dart` still carries a larger typography refactor (AppTextScaler, `kAppTextScale`, Fredoka, etc.) that must not be swept into unrelated commits.

## Summary

- Added `app font bump is one point` test importing `package:teen_aventure/theme.dart` and asserting `kAppFontBump == 1`.
- Set `const double kAppFontBump = 1` in the working tree (replacing `3` in the in-progress theme refactor).
- Committed via `git apply --cached` so only the three-line `kAppFontBump` addition on the HEAD `_appleText` baseline was staged, plus the test file — not the rest of the dirty theme hunks.

## TDD evidence

### RED (Step 2)

Command:

```bash
cd mobile_ && flutter test test/home_quest_progress_test.dart
```

Output (excerpt):

```
00:00 +3: app font bump is one point
00:00 +3 -1: app font bump is one point [E]
  Expected: <1>
    Actual: <3.0>
  
  package:matcher                                     expect
  package:flutter_test/src/widget_tester.dart 473:18  expect
  test/home_quest_progress_test.dart 33:5             main.<fn>
  
00:00 +3 -1: Some tests failed.
```

### GREEN (Step 4)

Command:

```bash
cd mobile_ && flutter test test/home_quest_progress_test.dart
```

Output:

```
00:00 +4: All tests passed!
```

## Commit

| SHA | Subject |
|-----|---------|
| `793c466` | fix: reduce the app-wide font bump to one point |

Files in commit:

- `mobile_/test/home_quest_progress_test.dart` — new test + import
- `mobile_/lib/theme.dart` — `const double kAppFontBump = 1;` (+ doc comment) after `AppRadii`

## Self-review

### Spec compliance

- `kAppFontBump == 1` in working tree and asserted by test.
- Did not modify `kAppTextScale` or any `fontSize` literal.
- TDD order: failing test → constant change → green run.

### Concerns

- **Unstaged theme diff (~169 lines):** Working copy still has the broader theme refactor (including `AppTextScaler` with default `bump = kAppFontBump`). The commit records the constant on the pre-refactor file shape so history stays minimal; runtime behavior in the dev tree uses the full refactor with bump `1`.
- **Staging hygiene:** Avoid `git commit -a` on this branch until the theme refactor is intentionally committed or split.

### Flutter review notes

- Test placement in existing `home_quest_progress_test.dart` matches Tasks 1–3 pattern.
- Constant-only commit is appropriate; no widget/test harness changes needed.

## Verification

```bash
cd mobile_ && flutter test test/home_quest_progress_test.dart
```

**Result:** 4 passed, 0 failed.

## Review fix: commit runtime font-bump wiring

Committed the existing runtime wiring in `mobile_/lib/theme.dart` and
`mobile_/lib/main.dart`: `AppTextScaler` applies `kAppFontBump` after
`kAppTextScale`, and the app-level `MediaQuery` installs that scaler for every
font. The committed `kAppFontBump` value remains `1`.

Command:

```bash
cd /home/bash/Desktop/ASKADONAI/ask_teens_app/mobile_
flutter test test/home_quest_progress_test.dart
```

Output:

```text
00:00 +0: loading /home/bash/Desktop/ASKADONAI/ask_teens_app/mobile_/test/home_quest_progress_test.dart
00:00 +0: watching video 3 first does not mark videos 1 and 2
00:00 +1: the same video awards points once
00:00 +2: three distinct videos open the quest count
00:00 +3: app font bump is one point
00:00 +4: All tests passed!
```
