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
  - **Delete** `addJarEntry` — CONTROLLER OVERRIDE: keep `addJarEntry` until Task 5 so parent screens still compile. Add types and demo data only.
  - Keep `getFamilyJar` unused by UI, or delete it if nothing imports it after Task 5

- [ ] **Step 1: Extend `FamilySummary` and related types** in `engagement_service.dart` as in the plan (FamilyChildScore, FamilyActivity, FamilySummary with children/recent). Copy `_parseDate` onto FamilyActivity instead of using FamilyJarEntry._parseDate if needed. Demo getFamilySummary: familyAskScore 42, familyJar 42, Sam 18 + Grace 24 using DemoAccount.samId.

- [ ] **Step 2: Do not delete addJarEntry in this task** (Task 5 removes it and callers).

- [ ] **Step 3: Analyzer** `cd mobile && dart analyze lib/services/engagement_service.dart`

- [ ] **Step 4: Commit** skip (not a git repo)
