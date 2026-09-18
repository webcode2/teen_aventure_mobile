# Task 1 Report: Extract `applyStreak`

## Status

**DONE_WITH_CONCERNS** — Code extract complete; existing API tests could not fully pass due to missing Postgres test database.

## Summary

Moved `localDay` and `applyStreak` from `backend/src/routes/engagement.routes.ts` into a new shared module `backend/src/lib/streak.ts`. Engagement routes now import both helpers from the lib. Behavior is unchanged (pure refactor).

## TDD / Test Evidence

This task is a refactor with no new test cases per the brief. Verification step:

```bash
cd backend && npm test -- tests/api.test.ts
```

**Result:** FAIL (exit code 1)

- **14 passed | 42 failed | 7 skipped** (63 total)
- Failures are environment-related, not caused by the streak extract:
  - `PrismaClientKnownRequestError P1003`: `Database askhub_test does not exist`
  - `PrismaClientKnownRequestError P2021`: `The table public.Child does not exist in the current database`
  - Later suite tests returned **401** after DB connection dropped (`Server has closed the connection`, P1017)
- Engagement suite tests that failed (e.g. "maintains the unified ASK Score and streaks") hit 500 from missing DB/tables before reaching streak logic.
- Early auth/family tests (first ~14) passed while Postgres was still reachable.

**Conclusion:** Refactor compiles cleanly (no linter errors). Regression verification blocked by test DB setup; recommend re-running after `askhub_test` exists and migrations are applied.

## Files Changed

| File | Action |
|------|--------|
| `backend/src/lib/streak.ts` | **Created** — exports `localDay`, `applyStreak` (verbatim copy from routes) |
| `backend/src/routes/engagement.routes.ts` | **Modified** — added `import { applyStreak, localDay } from '../lib/streak.js'`, removed local function definitions (~25 lines) |

## Implementation Details

### `backend/src/lib/streak.ts`

- Imports `prisma` from `./prisma.js`
- `localDay(date = new Date())`: normalizes date to UTC midnight
- `applyStreak(childId)`: creates/updates streak record (first day → current 1; same day → no-op; consecutive day → increment; gap → reset to 1)

### `backend/src/routes/engagement.routes.ts`

- Kept existing imports: `getActivityPoints`, `ACTIVITY_POINTS` re-export from `scoring.js`
- All call sites unchanged:
  - `localDay()` in submit, together complete
  - `applyStreak(childId)` after ledger create (submit BIY path, submit default path, together complete loop)

## Self-Review

- [x] Matches task brief verbatim (no logic changes)
- [x] Only `localDay` / `applyStreak` moved; scoring imports untouched
- [x] No new dependencies
- [x] No linter errors on changed files
- [x] Exports suitable for reuse by later engagement-jars tasks
- [ ] Full test PASS not confirmed (DB unavailable)

## Commits

None — workspace is not a git repository; commit step skipped per instructions.

## Concerns

1. **Test database missing:** `askhub_test` does not exist. Create DB + run Prisma migrations before relying on `tests/api.test.ts` for regression signal.
2. **Flaky suite under partial DB:** Some tests passed then later failed as Postgres connection/schema state degraded mid-run.

## Next Steps (for parent plan)

Task 2+ can import `applyStreak` / `localDay` from `backend/src/lib/streak.js` without duplicating streak logic.
