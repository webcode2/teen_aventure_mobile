# Engagement jars (PRD ASK Score + Family Jar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ASK Score, Family Jar, and Group Jar fill automatically from `ScoreLedger` (prd.txt §4.4, PRD_2.txt §4.1), keep them as three distinct product surfaces, show each child’s ASK Score, and stop parent bonus points.

**Architecture:** One ledger on write. On read: child ASK Score = sum by `childId`; family ASK Score and Family Jar = the same family sum (two PRD fields); Group Jar = church sum with distinct-family count. Extract `applyStreak` so teen-quest submit increments the daily streak.

**Tech Stack:** Fastify + Prisma + Vitest; Flutter + Provider + flutter_test.

**Spec:** `docs/superpowers/specs/2026-08-30-engagement-jars-design.md`

## Global Constraints

- Follow the spec. ASK Score and Family Jar stay two labeled features; do not rename explorer ASK Score to Jar.
- Points only from scored activities. No parent “Add 10 pts.”
- Group jar payload must not include family ids, names, or per-family amounts.
- Do not drop the `FamilyJarEntry` Prisma model (leave unused).
- Do not implement family streak or weekly streak in this plan.
- Do not commit unless the user asks.
- Scoring values stay `ACTIVITY_POINTS` / existing teen-quest points.

## File map

| File | Responsibility |
|------|----------------|
| Create `backend/src/lib/streak.ts` | `applyStreak(childId)` + shared `localDay()` |
| Modify `backend/src/routes/engagement.routes.ts` | Import streak helper; family/group jar reads from ledger; POST jar → 410 |
| Modify `backend/src/routes/teen-quest.routes.ts` | Call `applyStreak` after successful OBJS and scramble ledger writes |
| Modify `backend/tests/api.test.ts` | Ledger-based jar tests; streak on teen-quest submit |
| Modify `mobile/lib/services/engagement_service.dart` | `FamilySummary.children` + `recent`; delete `addJarEntry` |
| Modify `mobile/lib/screens/parent_home_dashboard.dart` | Use summary recent; remove Add 10 pts |
| Modify `mobile/lib/screens/parent_home_panel.dart` | Child ASK Score on cards; remove Add 10 pts |
| Modify `mobile/test/parent_home_dashboard_test.dart` | Assert Add 10 pts gone; score + jar labels remain |

---

### Task 1: Extract `applyStreak`

**Files:**
- Create: `backend/src/lib/streak.ts`
- Modify: `backend/src/routes/engagement.routes.ts` (remove local `localDay` / `applyStreak`; import from lib)
- Test: existing engagement tests in `backend/tests/api.test.ts` (no new cases yet)

**Interfaces:**
- Consumes: `prisma` from `backend/src/lib/prisma.ts`
- Produces:
  - `export function localDay(date?: Date): Date`
  - `export async function applyStreak(childId: string): Promise<{ id: string; childId: string; current: number; longest: number; lastDay: Date | null }>`

- [ ] **Step 1: Create `backend/src/lib/streak.ts`**

Copy the existing helpers out of `engagement.routes.ts` unchanged:

```typescript
import { prisma } from './prisma.js';

export function localDay(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function applyStreak(childId: string) {
  const today = localDay();
  let streak = await prisma.streak.findUnique({ where: { childId } });
  if (!streak) {
    streak = await prisma.streak.create({ data: { childId, current: 1, longest: 1, lastDay: today } });
    return streak;
  }
  if (streak.lastDay && streak.lastDay.getTime() === today.getTime()) return streak;

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const continued = streak.lastDay?.getTime() === yesterday.getTime();

  const current = continued ? streak.current + 1 : 1;
  return prisma.streak.update({
    where: { childId },
    data: { current, longest: Math.max(current, streak.longest), lastDay: today },
  });
}
```

- [ ] **Step 2: Switch engagement routes to the helper**

In `backend/src/routes/engagement.routes.ts`:

- Add `import { applyStreak, localDay } from '../lib/streak.js';`
- Delete the local `localDay` and `applyStreak` functions.
- Leave every `applyStreak(childId)` / `localDay()` call as-is.

- [ ] **Step 3: Run existing tests**

Run: `cd backend && npm test -- tests/api.test.ts`

Expected: PASS (behavior unchanged). Hub submit still increments streak.

- [ ] **Step 4: Commit** (skip unless the user asked)

```bash
git add backend/src/lib/streak.ts backend/src/routes/engagement.routes.ts
git commit -m "refactor: extract applyStreak for shared engagement use"
```

---

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

### Task 4: Flutter models — family summary from ledger

**Files:**
- Modify: `mobile/lib/services/engagement_service.dart`
- Test: `mobile/test/parent_home_dashboard_test.dart` is Task 5; this task is service types used there

**Interfaces:**
- Consumes: `GET /api/engagement/family` JSON from Task 2
- Produces:
  - `class FamilyChildScore { id/childId, name, askScore, streak }`
  - `class FamilyActivity { id, childId, childName, activityType, refKey, points, createdAt }`
  - `FamilySummary { familyAskScore, familyJar, children, streaks, recent }`
  - `getFamilySummary()` demo: `familyJar == familyAskScore`, children scores sum to that total
  - **Delete** `addJarEntry`
  - Keep `getFamilyJar` unused by UI, or delete it if nothing imports it after Task 5

- [ ] **Step 1: Extend `FamilySummary` and related types**

Replace `FamilySummary` in `engagement_service.dart` with:

```dart
class FamilyChildScore {
  final String childId;
  final String name;
  final int askScore;
  final int streak;

  const FamilyChildScore({
    required this.childId,
    required this.name,
    required this.askScore,
    required this.streak,
  });

  factory FamilyChildScore.fromJson(Map<String, dynamic> json) {
    return FamilyChildScore(
      childId: json['childId'] as String,
      name: json['name'] as String? ?? '',
      askScore: json['askScore'] as int? ?? 0,
      streak: json['streak'] as int? ?? 0,
    );
  }
}

class FamilyActivity {
  final String id;
  final String childId;
  final String childName;
  final String activityType;
  final String refKey;
  final int points;
  final DateTime createdAt;

  const FamilyActivity({
    required this.id,
    required this.childId,
    required this.childName,
    required this.activityType,
    required this.refKey,
    required this.points,
    required this.createdAt,
  });

  factory FamilyActivity.fromJson(Map<String, dynamic> json) {
    return FamilyActivity(
      id: json['id'] as String,
      childId: json['childId'] as String,
      childName: json['childName'] as String? ?? '',
      activityType: json['activityType'] as String? ?? '',
      refKey: json['refKey'] as String? ?? '',
      points: json['points'] as int? ?? 0,
      createdAt: FamilyJarEntry._parseDate(json['createdAt']),
    );
  }
}

class FamilySummary {
  final int familyAskScore;
  final int familyJar;
  final List<FamilyChildScore> children;
  final List<Streak> streaks;
  final List<FamilyActivity> recent;

  const FamilySummary({
    required this.familyAskScore,
    required this.familyJar,
    this.children = const [],
    this.streaks = const [],
    this.recent = const [],
  });

  factory FamilySummary.fromJson(Map<String, dynamic> json) {
    return FamilySummary(
      familyAskScore: json['familyAskScore'] as int? ?? 0,
      familyJar: json['familyJar'] as int? ?? 0,
      children: (json['children'] as List? ?? [])
          .map((e) => FamilyChildScore.fromJson(e as Map<String, dynamic>))
          .toList(),
      streaks: (json['streaks'] as List? ?? [])
          .map((e) => Streak.fromJson(e as Map<String, dynamic>))
          .toList(),
      recent: (json['recent'] as List? ?? [])
          .map((e) => FamilyActivity.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
```

Import `Streak` from `api_models.dart` if it is not already in this file. If `FamilyActivity` would call `FamilyJarEntry._parseDate` and that class is private-static here, copy the small `_parseDate` helper onto `FamilyActivity` instead of depending on `FamilyJarEntry`.

Update demo `getFamilySummary()`:

```dart
if (_demo) {
  return const FamilySummary(
    familyAskScore: 42,
    familyJar: 42,
    children: [
      FamilyChildScore(childId: DemoAccount.samId, name: 'Sam', askScore: 18, streak: 3),
      FamilyChildScore(childId: 'demo-sibling', name: 'Grace', askScore: 24, streak: 2),
    ],
    recent: [],
  );
}
```

Use a real demo child id from `DemoAccount` if `samId` is named differently — match `mobile/lib/config/demo_account.dart`.

- [ ] **Step 2: Delete `addJarEntry`**

Remove the method. Fix compile errors in screens in Task 5 (they still call it until then). If you implement Task 4 and 5 in one sitting, delete callers in the same change.

- [ ] **Step 3: Analyzer**

Run: `cd mobile && dart analyze lib/services/engagement_service.dart`

Expected: no errors on this file. Screens may still error until Task 5.

- [ ] **Step 4: Commit** (skip unless the user asked)

```bash
git add mobile/lib/services/engagement_service.dart
git commit -m "feat: parse family children ASK Scores and jar recent from API"
```

---

### Task 5: Parent UI — two PRD stats, child scores, no bonus button

**Files:**
- Modify: `mobile/lib/screens/parent_home_dashboard.dart`
- Modify: `mobile/lib/screens/parent_home_panel.dart`
- Test: `mobile/test/parent_home_dashboard_test.dart`

**Interfaces:**
- Consumes: `FamilySummary.children` and `FamilySummary.recent`
- Produces: UI with Family score + Family jar chips; child ASK Score on family panel; no “Add 10 pts”

- [ ] **Step 1: Extend the dashboard widget test**

In `mobile/test/parent_home_dashboard_test.dart`, after existing expects, add:

```dart
    expect(find.text('Family score'), findsOneWidget);
    expect(find.text('Family jar'), findsOneWidget);
    expect(find.text('Add 10 pts'), findsNothing);
```

The dashboard `_load` currently `context.read<EngagementService>()` and swallows errors. Either wrap with `Provider<EngagementService>.value` using a demo `ApiClient`, or keep swallowing — labels still render. If `_load` throws before first frame labels, provide a dummy service. Simplest: leave providers as-is; chips still build with `?? 0`.

- [ ] **Step 2: Run test — expect FAIL on Add 10 pts**

Run: `cd mobile && flutter test test/parent_home_dashboard_test.dart`

Expected: FAIL `findsNothing` because “Add 10 pts” is still on screen.

- [ ] **Step 3: Update `parent_home_dashboard.dart`**

- Change `_jar` to `List<FamilyActivity> _recent = const [];`
- `_load`: `final summary = await engagement.getFamilySummary();` then `_recent = summary.recent;` — do not call `getFamilyJar` or `addJarEntry`.
- Delete `_addJar`.
- Recent tiles: `title: entry.childName`, `subtitle: '${entry.activityType} · +${entry.points} pts'` (or a short label map if you already have one). Empty copy: `'Completed activities will show up here.'`
- Remove the QuickChip `'Add 10 pts'`.
- Keep Family score and Family jar chips bound to `_summary?.familyAskScore` and `_summary?.familyJar`.
- Drop `hide FamilyJarEntry` import if unused.

- [ ] **Step 4: Update `parent_home_panel.dart`**

- Delete `_addJar` and the `_QuickAction` `'Add 10 pts'`.
- Pass ASK Score into `_ChildCard`. Look up `FamilyChildScore` by `kids[i]['id']`:

```dart
FamilyChildScore? scoreFor(String id) {
  final matches = _summary?.children.where((c) => c.childId == id) ?? const [];
  return matches.isEmpty ? null : matches.first;
}
```

On `_ChildCard`, add `final int askScore` and `final int streakDays` (default 0). Under the age-band chip show:

```dart
Text(
  '$askScore ASK · $streakDays day streak',
  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted),
)
```

Keep the ASK score / Family jar / Group jar stat row.

- [ ] **Step 5: Re-run Flutter tests**

Run:

```
cd mobile && flutter test test/parent_home_dashboard_test.dart
```

Expected: PASS. Also run any parent panel test if one exists (`test/teacher_home_panel_test.dart` is unrelated; do not change it).

If `dart analyze` reports leftover `addJarEntry` or `FamilyJarEntry` on these screens, delete those references.

- [ ] **Step 6: Commit** (skip unless the user asked)

```bash
git add mobile/lib/screens/parent_home_dashboard.dart mobile/lib/screens/parent_home_panel.dart mobile/lib/services/engagement_service.dart mobile/test/parent_home_dashboard_test.dart
git commit -m "feat: show child ASK Scores and ledger Family Jar on parent home"
```

---

## Self-review vs spec

| Spec requirement | Task |
|------------------|------|
| Ledger is only source | 2 |
| Child ASK Score, no `jar` alias on `/score` | 2 test `jar` undefined |
| Family ASK Score and Family Jar both shown, equal | 2 + 5 |
| `familyJar === sum(children.askScore)` | 2 |
| Group jar distinct families, no family ids | 2 |
| POST jar 410 | 2 |
| Remove Add 10 pts | 5 |
| Teen quest applyStreak | 3 |
| Explorer keeps ASK Score label | no file change (YAGNI) |
| Family/weekly streak not built | respected |

No `GET /score` `jar` field. Parent uses “Family jar”; child uses “ASK Score.”
