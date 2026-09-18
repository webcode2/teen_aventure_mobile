# Review package Task 3

**Commits:** none

## Diff

- backend/src/routes/teen-quest.routes.ts: import applyStreak, localDay from ../lib/streak.js; localDay function removed; await applyStreak(childId) at lines 152 and 210 after successful scoreLedger.create (objs and scramble). 409 paths unchanged.
- backend/tests/api.test.ts ~1442-1449: GET /api/engagement/score/${tqTeen1Id} with tqTeen1Token; expect askScore >= 100, streak >= 1.

TDD: red on streak 0, then 63/63 pass.
