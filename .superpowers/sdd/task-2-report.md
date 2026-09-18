# Task 2 Report: Family and Group Jar from the ledger

## Status

**DONE** — Family Jar and Group Jar now read from `ScoreLedger`. Parent bonus POST is gone (410). All 63 API tests passed.

## Summary

ASK Score and Family Jar are two JSON fields that equal the same family ledger sum. `GET /family` now returns `children` and `recent` from `ScoreLedger`. `POST /family/jar` returns HTTP 410 and does not write. Group Jar totals church ledger points and counts distinct families. `FamilyJarEntry` remains in Prisma but these handlers no longer read or write it.

## TDD / Test Evidence

### Step 1 — Failing tests

Replaced `'Family Jar adds entries and totals'` and `'Group Jar exposes only aggregates — no per-family contributions'` in `backend/tests/api.test.ts` with the brief’s exact cases (verbatim).

### Step 2 — Confirm fail

```bash
cd backend && npm test -- tests/api.test.ts -t "Family Jar and ASK Score"
```

**Result:** FAIL (exit code 1) — 1 failed | 62 skipped.

Isolated `-t` skip of Auth/Church setup left tokens unset, so the new test hit 401 on submit. That is still a red run before handler changes. The brief’s expected 201-vs-410 miss could not surface under that filter because the file’s tokens are set in earlier `it` blocks.

### Step 3 — Implement

Replaced Family / Group Jar handlers in `backend/src/routes/engagement.routes.ts` as specified. One necessary adaptation: `ScoreLedger` has `familyId` but no Prisma `family` relation, so Group Jar filters via `child.family` (same church + `deletionStage: null` semantics).

### Step 4 — Confirm pass

```bash
cd backend && npm test -- tests/api.test.ts
```

**Result:** PASS (exit code 0)

- **63 passed (63)** in 118.53s
- New Family Jar and Group Jar tests passed
- Together / nudges / score / church-leave `familyAskScore === 78` still passed

Used the full file (not `-t "Engagement"`) because this suite is sequential; filtering Engagement alone skips token setup and 401s.

## Files Changed

| File | Action |
|------|--------|
| `backend/tests/api.test.ts` | **Modified** — replaced Family Jar and Group Jar tests with brief text |
| `backend/src/routes/engagement.routes.ts` | **Modified** — ledger-backed `GET /family`, `GET /family/jar`, `POST /family/jar` 410, ledger `GET /group-jar` |

Not changed: `backend/src/lib/streak.ts`, teen-quest routes, Flutter, Prisma schema (`FamilyJarEntry` kept).

## Implementation Details

### `GET /family` (parent)

- `familyAskScore` = `SUM(ScoreLedger.points)` for `familyId`
- `familyJar` = same number
- `children[]` = every child (`childId`, `name`, `askScore`, `streak`); zero-score kids included
- `streaks` = existing `Streak` rows (compat key)
- `recent` = latest 20 ledger rows (`id`, `childId`, `childName`, `activityType`, `refKey`, `points`, `createdAt`)

### `GET /score/:childId`

Unchanged. Shape remains `{ askScore, streak, longestStreak }`. Test asserts `jar` is undefined.

### `GET /family/jar`

Returns `{ entries: <same array as recent> }` from the ledger, not `FamilyJarEntry`.

### `POST /family/jar`

`410` `{ message: "Jar points come from engagement only" }`. No create.

### `GET /group-jar`

```
{ groupJarTotal, contributingFamilies }
```

- `groupBy familyId` on `ScoreLedger`
- Scope: child’s family `churchId` matches and `deletionStage` is null
- `groupJarTotal` = sum of points; `contributingFamilies` = distinct families with any ledger row
- Payload keys only those two (privacy test still forbids `familyId` in JSON)

## Self-Review

- [x] Brief tests used verbatim
- [x] ASK Score and Family Jar are two fields; they equal the same family sum
- [x] `GET /score/:childId` has no `jar` alias
- [x] `FamilyJarEntry` not dropped; not read/written in these handlers
- [x] Task 1 `applyStreak` / `localDay` imports kept
- [x] Teen-quest routes and Flutter untouched
- [x] `requireParent` / `requireAuth` unchanged
- [x] Full API suite PASS
- [x] No commit (workspace is not a git repo)

### Intentional deviation

Brief snippet used `where: { family: { churchId, deletionStage: null } }`. `ScoreLedger` has no `family` relation (only a denormalized `familyId`, no FK). Implemented `where: { child: { family: { churchId, deletionStage: null } } }` so the query type-checks and matches the product rule without a schema change.

## Commits

None — workspace is not a git repository; commit step skipped per instructions.

## Concerns

None that block the task. Isolated `-t "Family Jar and ASK Score"` / `-t "Engagement"` cannot pass on this file because tokens are created in earlier describes; run the full `tests/api.test.ts` for a real signal.

## Next Steps (for parent plan)

Task 3 can add `applyStreak` on teen-quest submit. Tasks 4–5 can consume `GET /family` `children` + `recent` and drop “Add 10 pts”.
