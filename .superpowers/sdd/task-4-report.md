# Task 4 Report: Flutter models — family summary from ledger

## Status

**DONE** — `FamilySummary` parses `children` and `recent` from `GET /api/engagement/family`. Demo totals match (`familyJar == familyAskScore == 42`; Sam 18 + Grace 24). `addJarEntry` kept for Task 5. Analyzer: no issues on this file.

## Summary

Parent family JSON from Task 2 is now typed on Flutter: each child’s ASK Score plus a Family Jar activity feed. Demo data uses real `DemoAccount` child ids so Task 5 card lookups will match. Parent screens were not changed.

## Steps

### Step 1 — Extend types

In `mobile/lib/services/engagement_service.dart`:

- Added `FamilyChildScore` (`childId`, `name`, `askScore`, `streak`). `fromJson` accepts `childId` or `id`.
- Added `FamilyActivity` (`id`, `childId`, `childName`, `activityType`, `refKey`, `points`, `createdAt`) with a local `_parseDate` (not `FamilyJarEntry._parseDate`).
- Extended `FamilySummary` with `children` and `recent`. Constructor defaults: `children`, `streaks`, and `recent` are `const []`, so existing `FamilySummary(familyAskScore:, familyJar:, streaks: [])` still compiles.
- `Streak` comes from the existing `api_models.dart` import.

Demo `getFamilySummary()`:

```dart
familyAskScore: 42,
familyJar: 42,
children: [
  FamilyChildScore(childId: DemoAccount.samId, name: 'Sam', askScore: 18, streak: 3),
  FamilyChildScore(childId: DemoAccount.childId, name: 'Grace', askScore: 24, streak: 2),
],
recent: [],
```

Grace uses `DemoAccount.childId` (`demo-grace`), not the plan placeholder `'demo-sibling'`, so ids match `DemoAccount.childrenJson`.

### Step 2 — Keep `addJarEntry`

Left in place (controller override). `getFamilyJar` also unchanged. Parent screens still compile until Task 5.

### Step 3 — Analyzer

```bash
cd mobile && dart analyze lib/services/engagement_service.dart
```

SDK: `C:\flutter-sdk\flutter\bin\dart.bat` (`dart` not on PATH).

**Result:** `Analyzing engagement_service.dart... No issues found!` (exit 0)

No Flutter widget tests in this task (`parent_home_dashboard_test.dart` is Task 5).

### Step 4 — Commit

Skipped — workspace is not a git repository.

## Files Changed

| File | Action |
|------|--------|
| `mobile/lib/services/engagement_service.dart` | **Modified** — `FamilyChildScore`, `FamilyActivity`, `FamilySummary` children/recent, demo 42/42 |

Not changed: parent screens, `addJarEntry`, `getFamilyJar`, `api_models.dart`, backend.

## Self-Review

- [x] `familyJar == familyAskScore` in demo (both 42)
- [x] Children scores sum to family total (18 + 24 = 42)
- [x] `DemoAccount.samId` for Sam; Grace uses `DemoAccount.childId`
- [x] Local `_parseDate` on `FamilyActivity`
- [x] `Streak` from `api_models.dart`
- [x] Named defaults on `FamilySummary` (`streaks` default empty list)
- [x] `addJarEntry` kept
- [x] Parent screens untouched
- [x] Analyzer clean on this file
- [x] No commit

## Commits

None — workspace is not a git repository; commit step skipped per instructions.

## Concerns

1. Demo `recent` is empty. Task 5 empty-state copy (“Completed activities will show up here.”) will show in demo until live API data is used.
2. `getFamilyJar` still returns `List<FamilyJarEntry>` while the backend now returns `{ entries: <recent> }`. Live (non-demo) jar fetch may fail until Task 5 stops calling it. Demo path returns `const []`, so demo UI is unaffected.
3. Plan snippet used `FamilyJarEntry._parseDate`; that helper is library-private (`_parseDate`). Copied onto `FamilyActivity` as instructed.

## Next Steps (for parent plan)

Task 5: parent dashboard/panel consume `summary.children` and `summary.recent`, remove “Add 10 pts” / `addJarEntry` callers, stop calling `getFamilyJar`.
