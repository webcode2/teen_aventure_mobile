### Task 3: Teen-quest submit updates daily streak

**Files:**
- Modify: `backend/src/routes/teen-quest.routes.ts` (both submit handlers, after successful `scoreLedger.create`)
- Test: `backend/tests/api.test.ts` inside `'teacher activates quiz for class, teen submits Objs & Cross Scramble'`

**Interfaces:**
- Consumes: `applyStreak` from `backend/src/lib/streak.ts`
- Produces: unchanged HTTP bodies; side effect writes/updates `Streak` for `childId`

- [ ] **Step 1: Add assertions to the existing submit test**

After the scramble `expect(scramble.statusCode).toBe(201)` block, add:

```typescript
    const tqScore = await app.inject({
      method: 'GET',
      url: `/api/engagement/score/${tqTeen1Id}`,
      headers: { authorization: `Bearer ${tqTeen1Token}` },
    });
    expect(tqScore.statusCode).toBe(200);
    expect(tqScore.json().askScore).toBeGreaterThanOrEqual(100);
    expect(tqScore.json().streak).toBeGreaterThanOrEqual(1);
```

Use the real teen id variable from that describe (`tqTeen1Id` — confirm the name at the top of the Teen Quest describe; it is the child id for Alex). If the score route is forbidden for that token, use the same child token the submit used.

- [ ] **Step 2: Run that test — expect streak 0 / fail**

Run: `cd backend && npm test -- tests/api.test.ts -t "teacher activates quiz"`

Expected: FAIL on `streak >= 1` (ledger exists, streak row missing).

- [ ] **Step 3: Call `applyStreak` after both ledger creates**

In `teen-quest.routes.ts`:

- Add `import { applyStreak, localDay } from '../lib/streak.js';`
- Delete the local `localDay` in that file.
- After each successful `prisma.scoreLedger.create` in `submit-objs` and `submit-scramble`, `await applyStreak(childId);` before `return reply.status(201)...`

Do not call `applyStreak` on the 409 duplicate path.

- [ ] **Step 4: Re-run**

Run: `cd backend && npm test -- tests/api.test.ts -t "teacher activates quiz"`

Expected: PASS.

- [ ] **Step 5: Commit** (skip unless the user asked)

```bash
git add backend/src/routes/teen-quest.routes.ts backend/tests/api.test.ts
git commit -m "fix: apply daily streak when teen quest scores land"
```

---

