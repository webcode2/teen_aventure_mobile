# Task 3 Report: Teen-quest submit updates daily streak

## Status

**DONE** — `submit-objs` and `submit-scramble` call `applyStreak` after a successful `ScoreLedger` create. HTTP bodies unchanged. Full API suite passed (63/63).

## Summary

Teen Quest Objective and Cross Scramble submits now write/update `Streak` for `childId` via the shared `applyStreak` helper (Task 1). Duplicate 409 paths do not touch streak. Local `localDay` in `teen-quest.routes.ts` was removed in favor of the lib export.

## TDD / Test Evidence

### Step 1 — Assertions first

Added the brief’s exact block after the scramble `201` expects in `'teacher activates quiz for class, teen submits Objs & Cross Scramble'`, using `tqTeen1Id` / `tqTeen1Token`.

### Step 2 — Confirm fail

```bash
cd backend && npm test -- tests/api.test.ts -t "teacher activates quiz"
```

**Result:** FAIL (exit code 1) — **wrong reason.** `tqQuestId` is set in `'fetches published Teen Quest weeks'`, which was skipped. Activate returned 500 (Zod: `questId` undefined) instead of reaching streak.

Re-ran with setup included:

```bash
cd backend && npm test -- tests/api.test.ts -t "fetches published Teen Quest weeks|teacher activates quiz"
```

**Result:** FAIL (exit code 1) — 1 failed | 1 passed | 61 skipped.

```
AssertionError: expected 0 to be greater than or equal to 1
  tests/api.test.ts:1449  expect(tqScore.json().streak).toBeGreaterThanOrEqual(1)
```

Score GET was 200 and `askScore >= 100` (ledger existed). Streak was 0 (no `Streak` row). This is the intended red.

### Step 3 — Implement

In `backend/src/routes/teen-quest.routes.ts`:

- `import { applyStreak, localDay } from '../lib/streak.js';`
- Deleted the local `localDay`
- `await applyStreak(childId);` after each successful `prisma.scoreLedger.create` in `submit-objs` and `submit-scramble`, before `return reply.status(201)...`
- 409 `P2002` catch paths unchanged (no `applyStreak`)

### Step 4 — Confirm pass

Same focused filter as the true red:

```bash
cd backend && npm test -- tests/api.test.ts -t "fetches published Teen Quest weeks|teacher activates quiz"
```

**Result:** PASS — 2 passed | 61 skipped.

Then full file:

```bash
cd backend && npm test -- tests/api.test.ts
```

**Result:** PASS (exit code 0)

- **63 passed (63)** in 54.37s
- Teen-quest submit + score/streak assertions passed
- Engagement, Family/Group Jar, and remaining Teen Quest tests still passed

## Files Changed

| File | Action |
|------|--------|
| `backend/tests/api.test.ts` | **Modified** — score/streak assertions after scramble 201 |
| `backend/src/routes/teen-quest.routes.ts` | **Modified** — shared `localDay` / `applyStreak`; streak after successful ledger create |

Not changed: `backend/src/lib/streak.ts`, engagement jar handlers, Flutter, Prisma schema.

## Implementation Details

Both handlers keep `{ entry, totalPoints, itemResults }` on 201.

Same-day objs + scramble: `applyStreak` is idempotent when `lastDay === today`, so the second submit does not increment. Streak is 1; the test asserts `>= 1`.

## Self-Review

- [x] Assertions used verbatim with `tqTeen1Id` / `tqTeen1Token`
- [x] Watched fail on `streak >= 1` (after including weeks setup)
- [x] Import from `../lib/streak.js`; local `localDay` deleted
- [x] `applyStreak` only after successful create, not on 409
- [x] HTTP bodies unchanged
- [x] Flutter and engagement jar handlers untouched
- [x] Full API suite PASS
- [x] No commit (workspace is not a git repo)

## Commits

None — workspace is not a git repository; commit step skipped per instructions.

## Concerns

Isolated `-t "teacher activates quiz"` cannot pass on this file because `tqQuestId` is assigned in an earlier `it`. Include `'fetches published Teen Quest weeks'` or run the full `tests/api.test.ts`. This is the same sequential-token pattern noted in Task 2.

## Next Steps (for parent plan)

Tasks 4–5 can consume family `children` + `recent` and drop “Add 10 pts”. Teen-quest scores now count toward daily streak as well as ASK Score / jars.
