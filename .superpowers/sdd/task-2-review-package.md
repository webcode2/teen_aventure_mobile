# Review package Task 2

**Base:** Task 1 complete (streak extracted)
**Head:** Task 2 working tree
**Commits:** none

## Files

- Modify: backend/src/routes/engagement.routes.ts lines 101–185
- Modify: backend/tests/api.test.ts lines 679–777

## GET /family, /family/jar, POST /family/jar, GET /group-jar

See engagement.routes.ts:101-185 (full handlers).

Notable: groupBy where uses `child: { family: { churchId, deletionStage: null } }` because ScoreLedger has familyId but no Prisma family relation (plan showed `family: { churchId }`).

GET /family/jar and GET /family both map recent ledger rows with the same DTO fields (plan-mandated duplication).

## Tests

api.test.ts 679–777: Family Jar from engagement + 410 on POST; Group Jar distinct families, no familyId in payload.

Implementer reports: `npm test -- tests/api.test.ts` → 63/63 passed.
