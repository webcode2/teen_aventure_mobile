### Task 2: Family and Group Jar from the ledger

**Files:**
- Modify: `backend/src/routes/engagement.routes.ts` (`GET /family`, `GET /family/jar`, `POST /family/jar`, `GET /group-jar`)
- Test: `backend/tests/api.test.ts` (replace the Family Jar add-entry test; extend Group Jar)

**Interfaces:**
- Consumes: `ScoreLedger`, `Child`, `Streak`, `Family`
- Produces `GET /family` JSON:
  - `familyAskScore: number`
  - `familyJar: number` (must equal `familyAskScore`)
  - `children: Array<{ childId: string; name: string; askScore: number; streak: number }>`
  - `streaks: Streak[]` (unchanged key)
  - `recent: Array<{ id, childId, childName, activityType, refKey, points, createdAt }>` (max 20)
- Produces `GET /family/jar`: `{ entries: recent }`
- Produces `POST /family/jar`: HTTP 410 `{ message: "Jar points come from engagement only" }`
- Produces `GET /group-jar`: `{ groupJarTotal: number; contributingFamilies: number }` from ledger `groupBy familyId`

- [ ] **Step 1: Write the failing tests**

In `backend/tests/api.test.ts`, **replace** the test `'Family Jar adds entries and totals'` with:

```typescript
  it('Family Jar and ASK Score fill from engagement, not parent bonus', async () => {
    const before = await app.inject({
      method: 'GET',
      url: `/api/engagement/score/${childId}`,
      headers: { authorization: `Bearer ${childToken}` },
    });
    const prior = before.json().askScore as number;

    const submit = await app.inject({
      method: 'POST',
      url: '/api/engagement/submit',
      headers: { authorization: `Bearer ${childToken}` },
      payload: { activityType: 'LIFE_PRAYER', refKey: 'jar-auto-1' },
    });
    expect(submit.statusCode).toBe(201);
    expect(submit.json().points).toBe(10);

    const score = await app.inject({
      method: 'GET',
      url: `/api/engagement/score/${childId}`,
      headers: { authorization: `Bearer ${childToken}` },
    });
    expect(score.json().askScore).toBe(prior + 10);
    expect(score.json().jar).toBeUndefined();

    const fam = await app.inject({
      method: 'GET',
      url: '/api/engagement/family',
      headers: { authorization: `Bearer ${parentToken}` },
    });
    expect(fam.statusCode).toBe(200);
    const body = fam.json();
    expect(body.familyJar).toBe(body.familyAskScore);
    const sam = body.children.find((c: { childId: string }) => c.childId === childId);
    expect(sam.askScore).toBe(prior + 10);
    expect(body.familyJar).toBe(body.children.reduce((s: number, c: { askScore: number }) => s + c.askScore, 0));
    expect(body.recent.some((r: { refKey: string }) => r.refKey === 'jar-auto-1')).toBe(true);

    const bonus = await app.inject({
      method: 'POST',
      url: '/api/engagement/family/jar',
      headers: { authorization: `Bearer ${parentToken}` },
      payload: { label: 'Family blessing', points: 25 },
    });
    expect(bonus.statusCode).toBe(410);

    const afterBonus = await app.inject({
      method: 'GET',
      url: '/api/engagement/family',
      headers: { authorization: `Bearer ${parentToken}` },
    });
    expect(afterBonus.json().familyJar).toBe(body.familyJar);
  });
```

Replace `'Group Jar exposes only aggregates — no per-family contributions'` with:

```typescript
  it('Group Jar aggregates church ledger and counts distinct families', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/families/join-church',
      headers: { authorization: `Bearer ${parent2Token}` },
      payload: { joinCode: churchJoinCode },
    });
    const p2child = await app.inject({
      method: 'POST',
      url: '/api/families/children',
      headers: { authorization: `Bearer ${parent2Token}` },
      payload: { name: 'Noah', ageBand: 'CHILD' },
    });
    const p2childId = p2child.json().id as string;
    await app.inject({
      method: 'PUT',
      url: `/api/auth/children/${p2childId}/pin`,
      headers: { authorization: `Bearer ${parent2Token}` },
      payload: { pin: '2468' },
    });
    const p2tok = await app.inject({
      method: 'POST',
      url: '/api/auth/child-pin',
      payload: { childId: p2childId, pin: '2468' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/engagement/submit',
      headers: { authorization: `Bearer ${p2tok.json().token}` },
      payload: { activityType: 'LIFE_PRAYER', refKey: 'group-jar-p2' },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/engagement/group-jar',
      headers: { authorization: `Bearer ${parentToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.groupJarTotal).toBeGreaterThan(0);
    expect(body.contributingFamilies).toBeGreaterThanOrEqual(2);
    const raw = JSON.stringify(body);
    expect(raw).not.toContain(familyId);
    expect(Object.keys(body).sort()).toEqual(['contributingFamilies', 'groupJarTotal'].sort());
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- tests/api.test.ts -t "Family Jar and ASK Score"`

Expected: FAIL — `POST /family/jar` still 201, `children` missing, `familyJar` still the old bonus total.

- [ ] **Step 3: Implement family + group reads**

Replace the Family Jar / Group Jar handlers in `backend/src/routes/engagement.routes.ts` (keep `requireParent` / `requireAuth` as today):

```typescript
  fastify.get('/family', { preHandler: [fastify.requireParent] }, async (request) => {
    const familyId = request.familyId!;
    const kids = await prisma.child.findMany({ where: { familyId }, select: { id: true, name: true } });
    const childIds = kids.map((c) => c.id);

    const [total, streaks, recent, perChild] = await Promise.all([
      prisma.scoreLedger.aggregate({ _sum: { points: true }, where: { familyId } }),
      prisma.streak.findMany({ where: { childId: { in: childIds } } }),
      prisma.scoreLedger.findMany({
        where: { familyId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { child: { select: { name: true } } },
      }),
      prisma.scoreLedger.groupBy({
        by: ['childId'],
        _sum: { points: true },
        where: { familyId },
      }),
    ]);

    const scoreByChild = new Map(perChild.map((r) => [r.childId, r._sum.points || 0]));
    const streakByChild = new Map(streaks.map((s) => [s.childId, s.current]));
    const familyAskScore = total._sum.points || 0;
    const recentDto = recent.map((r) => ({
      id: r.id,
      childId: r.childId,
      childName: r.child.name,
      activityType: r.activityType,
      refKey: r.refKey,
      points: r.points,
      createdAt: r.createdAt,
    }));

    return {
      familyAskScore,
      familyJar: familyAskScore,
      children: kids.map((c) => ({
        childId: c.id,
        name: c.name,
        askScore: scoreByChild.get(c.id) || 0,
        streak: streakByChild.get(c.id) || 0,
      })),
      streaks,
      recent: recentDto,
    };
  });

  fastify.get('/family/jar', { preHandler: [fastify.requireParent] }, async (request) => {
    const family = await prisma.scoreLedger.findMany({
      where: { familyId: request.familyId! },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { child: { select: { name: true } } },
    });
    return {
      entries: family.map((r) => ({
        id: r.id,
        childId: r.childId,
        childName: r.child.name,
        activityType: r.activityType,
        refKey: r.refKey,
        points: r.points,
        createdAt: r.createdAt,
      })),
    };
  });

  fastify.post('/family/jar', { preHandler: [fastify.requireParent] }, async (_request, reply) => {
    return reply.status(410).send({ message: 'Jar points come from engagement only' });
  });

  fastify.get('/group-jar', { preHandler: [fastify.requireAuth] }, async (request) => {
    if (!request.churchId) throw { statusCode: 404, message: 'No church associated' };
    const rows = await prisma.scoreLedger.groupBy({
      by: ['familyId'],
      _sum: { points: true },
      where: { family: { churchId: request.churchId, deletionStage: null } },
    });
    return {
      groupJarTotal: rows.reduce((sum, r) => sum + (r._sum.points || 0), 0),
      contributingFamilies: rows.length,
    };
  });
```

- [ ] **Step 4: Run the engagement tests**

Run: `cd backend && npm test -- tests/api.test.ts -t "Engagement"`

Expected: PASS for the new Family Jar and Group Jar tests. Together / nudges / score tests still pass.

- [ ] **Step 5: Commit** (skip unless the user asked)

```bash
git add backend/src/routes/engagement.routes.ts backend/tests/api.test.ts
git commit -m "feat: fill Family Jar and Group Jar from the engagement ledger"
```

---

