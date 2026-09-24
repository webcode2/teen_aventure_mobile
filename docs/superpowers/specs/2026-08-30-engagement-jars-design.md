# Engagement jars — PRD ASK Score, Family Jar, Group Jar

**Date:** 2026-08-30  
**Revision:** Follow `prd.txt` §4.4 and `PRD_2.txt` §4.1. ASK Score and Family Jar are **two product features**, not one label.  
**Source of truth for points:** `ScoreLedger` only.  
**User rules that still apply:** points come from engagement automatically; the family jar is all children’s activity; each child has their own points (the child’s ASK Score).

## PRD mapping

`prd.txt` §4.4 lists these as separate engagement features:

1. Unified ASK Score
2. Activity points (scoring rules + ledger)
3. Individual and family streaks
4. Family Jar
5. Aggregate Group Jar (no individual family contributions exposed)

`PRD_2.txt` §4.1 says every hub activity writes `ScoreLedger` and those points **contribute to all of**:

- the child’s unified ASK Score
- daily and weekly streaks
- Family Jar contributions and Group Jar aggregates

So they are different features and different UI, fed by the same engagement events. They are not a parent-typed bonus pot.

| Feature | Scope | Number | UI name |
|---------|--------|--------|---------|
| ASK Score | One child | `SUM(ScoreLedger)` for `childId` | Explorer and child cards: **ASK Score** |
| Family ASK Score | Whole family | `SUM(ScoreLedger)` for `familyId` | Parent: **ASK score** |
| Family Jar | Whole family | Same family ledger sum (all children) | Parent: **Family jar** |
| Child contribution | One child inside the family jar | That child’s ASK Score | Parent child card + family breakdown |
| Group Jar | Church | Sum of those family totals | Parent (when in a church): **Group jar** |

Family ASK Score and Family Jar will match numerically because both are the family ledger total. That is correct: one stream of engagement, two PRD surfaces (score vs jar). Do not hide one of them. Do not tell the explorer that ASK Score “is a jar.”

Each child’s individual pot is **ASK Score** (PRD name). The family jar is the family feature, with each child’s score visible as their contribution.

## Problem this change fixes

Today Family Jar is `FamilyJarEntry` filled by parent “Add 10 pts.” That is not in the PRD. PRD_2 requires activity points to contribute to the Family Jar. Group jar currently counts jar **rows**, not distinct families.

## Product rules

1. Completing a scored activity is the only way points enter ASK Score, Family Jar, or Group Jar. Parents cannot add bonus points.
2. Child ASK Score = that child’s ledger total.
3. Family Jar = sum of all children’s ASK Scores in the family (all of their activity).
4. Family ASK Score = the same family ledger total, shown as the score feature.
5. Group Jar = church-wide sum of family jars. `contributingFamilies` = count of **distinct families** with any ledger points. Payload never includes family ids, names, or per-family amounts (`prd.txt` §4.4).
6. Together Mode already credits each participating child on the ledger; those points count toward each ASK Score and therefore the Family Jar.
7. Duplicate submits stay 409; totals unchanged.

## Out of scope

- **Family streak** and **weekly streak** are PRD features that still do not exist. This plan does not invent them. Individual daily streak already exists and must keep incrementing on hub submit, Together, and (after this change) teen-quest submit.
- Dropping the `FamilyJarEntry` Prisma table (leave unused; no destructive migration).
- UTC day-boundary changes or explorer streak-banner weekday dots.
- Changing `ACTIVITY_POINTS` or teen-quest point values.

## Architecture

```
Activity complete
    → ScoreLedger row (existing, one source)
    → child ASK Score     = SUM(ledger) for childId
    → family ASK Score    = SUM(ledger) for familyId
    → Family Jar          = same family sum (jar surface)
    → Group Jar           = SUM(ledger) for families in church (deletionStage null)

No FamilyJarEntry writes.
```

Extract `applyStreak(childId)` from `backend/src/routes/engagement.routes.ts` into `backend/src/lib/streak.ts`. Hub submit and Together already call it. Teen quest OBJS and scramble write ledger today but skip streak; they must call `applyStreak` so quest days count (`PRD_2` §4.1: points contribute to streaks).

Totals are computed on read. Do not copy ledger rows into a second table.

## Data

Keep: `ScoreLedger`, `Streak`.

Stop using for product totals: `FamilyJarEntry`. Existing parent-bonus rows stay in the database and are ignored. Do not copy them into the ledger (they were not activities).

## API

### `GET /api/engagement/score/:childId`

Child ASK Score. Do **not** add a `jar` alias. Shape stays:

```json
{ "askScore": 18, "streak": 3, "longestStreak": 5 }
```

### `GET /api/engagement/family` (parent)

Both PRD family totals from the ledger. Include each child’s ASK Score (their individual pot) and recent contributions for the Family Jar feed.

```json
{
  "familyAskScore": 42,
  "familyJar": 42,
  "children": [
    { "childId": "…", "name": "Sam", "askScore": 18, "streak": 3 }
  ],
  "streaks": [],
  "recent": [
    {
      "id": "…",
      "childId": "…",
      "childName": "Sam",
      "activityType": "PRAYER_STEP",
      "refKey": "…",
      "points": 28,
      "createdAt": "…"
    }
  ]
}
```

Invariants:

- `familyAskScore === familyJar` (same ledger, two PRD fields).
- `familyJar === sum(children[].askScore)`.
- `children` includes every child in the family, including those with 0 points.
- `streaks` remains existing `Streak` rows for compatibility; `children[].streak` is `current` (0 if none).
- `recent` = latest 20 ledger rows for the family, newest first.
- Child names are family-visible (parent’s own family).

Keep the `streaks` key so older clients do not break. New Flutter uses `children`.

### `GET /api/engagement/family/jar`

Return `{ "entries": <same array as recent> }` (Family Jar contribution feed from the ledger). Do not return `FamilyJarEntry`. New UI uses `GET /family` and does not call this path.

### `POST /api/engagement/family/jar`

**410** `{ "message": "Jar points come from engagement only" }`. No new rows. Not a PRD capability.

### `GET /api/engagement/group-jar`

Keep `{ groupJarTotal, contributingFamilies }`. Compute from `ScoreLedger` where `family.churchId` matches and `family.deletionStage` is null.

- `groupJarTotal` = sum of points.
- `contributingFamilies` = distinct `familyId` with at least one ledger row.
- JSON must not contain family ids or names (existing privacy test).

## Mobile

### Service (`engagement_service.dart`)

- Extend `FamilySummary` with `children` and `recent`. Demo: `familyJar == familyAskScore`; demo children scores sum to that total.
- Delete `addJarEntry`.
- Parent home uses `summary.recent`. Do not call `getFamilyJar` from UI.

### Parent home dashboard

- Keep **Family score** and **Family jar** chips (two PRD features). Both show the ledger family total.
- Recent list = `summary.recent`. Empty copy: “Completed activities will show up here.”
- Remove “Add 10 pts”.

### Parent family panel

- Keep **ASK score**, **Family jar**, and **Group jar** when in a church.
- Each `_ChildCard` shows that child’s **ASK Score** (individual pot) and streak from `summary.children`.
- Remove “Add 10 pts”.

### Explorer

Keep the ASK Score label. That number is the child’s individual pot. Do not add a second counter named Jar.

## Error handling

- Duplicate activity: 409; scores and jars unchanged.
- `GET /family`: parent only (existing).
- Child reads only their own `GET /score/:childId` (existing).
- `POST /family/jar`: 410.
- Group jar with no `churchId`: 404 (existing).

## Testing

Backend (`backend/tests/api.test.ts`), replace “Family Jar adds entries and totals”:

1. Child submit → `GET /score/:id` `askScore` equals awarded points (plus prior).
2. Parent `GET /family` → `familyJar === familyAskScore`, `children` includes that child with the same `askScore`, `recent` contains the row.
3. Second child in the family submits → family jar equals the sum of both ASK Scores.
4. `POST /family/jar` is 410; family jar does not increase.
5. Group jar: two church families with ledger points → total is the sum; `contributingFamilies === 2`; body has neither `familyId`. One family with two ledger rows still counts as **one** family.
6. Teen quest OBJS/scramble submit increments `Streak.current` on a new day.

Flutter: parent dashboard has ASK/family-score and Family jar, and `findsNothing` for “Add 10 pts”.

## Success criteria

- Activity completion increases that child’s ASK Score and the Family Jar with no parent tap.
- Parent still sees ASK score and Family jar as two features; they match; they equal the sum of the children.
- Each child card shows that child’s ASK Score.
- Group jar is church engagement, private, distinct-family count.
- “Add 10 pts” is gone. Manual jar POST is 410.
- Teen quest points already hit the ledger; they also increment the daily streak.
