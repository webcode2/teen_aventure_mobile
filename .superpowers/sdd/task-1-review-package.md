# Review package Task 1

**Base:** working tree before extract (localDay/applyStreak lived in engagement.routes.ts)
**Head:** working tree after extract
**Commits:** none (not a git repo)

## Stat

- Create: backend/src/lib/streak.ts (28 lines)
- Modify: backend/src/routes/engagement.routes.ts (removed local helpers, added import from ../lib/streak.js)

## Diff (conceptual)

### Added backend/src/lib/streak.ts (full file)

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

### engagement.routes.ts

Added after scoring import:
```
import { applyStreak, localDay } from '../lib/streak.js';
```

Removed the previous local `function localDay` and `async function applyStreak` (same bodies as above).

Kept:
```
import { getActivityPoints } from '../lib/scoring.js';
export { DEFAULT_ACTIVITY_POINTS as ACTIVITY_POINTS } from '../lib/scoring.js';
```

Call sites still use `localDay()` and `applyStreak(childId)` in submit and together complete.
