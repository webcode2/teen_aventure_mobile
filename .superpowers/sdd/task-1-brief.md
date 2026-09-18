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

