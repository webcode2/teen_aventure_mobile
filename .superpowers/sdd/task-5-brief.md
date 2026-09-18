### Task 5: Parent UI — two PRD stats, child scores, no bonus button

**Files:**
- Modify: `mobile/lib/screens/parent_home_dashboard.dart`
- Modify: `mobile/lib/screens/parent_home_panel.dart`
- Modify: `mobile/lib/services/engagement_service.dart` (delete addJarEntry now)
- Test: `mobile/test/parent_home_dashboard_test.dart`

**Interfaces:**
- Consumes: `FamilySummary.children` and `FamilySummary.recent`
- Produces: UI with Family score + Family jar chips; child ASK Score on family panel; no “Add 10 pts”

- [ ] **Step 1:** In `parent_home_dashboard_test.dart` after existing expects add:
```dart
    expect(find.text('Family score'), findsOneWidget);
    expect(find.text('Family jar'), findsOneWidget);
    expect(find.text('Add 10 pts'), findsNothing);
```

- [ ] **Step 2:** Run `cd mobile && flutter test test/parent_home_dashboard_test.dart` — expect FAIL on Add 10 pts.

- [ ] **Step 3:** Update `parent_home_dashboard.dart`
- Change `_jar` to `List<FamilyActivity> _recent = const [];`
- `_load`: summary only; `_recent = summary.recent`; do not call getFamilyJar or addJarEntry.
- Delete `_addJar`.
- Recent tiles: title entry.childName, subtitle activityType + points. Empty copy: 'Completed activities will show up here.'
- Remove QuickChip 'Add 10 pts'.
- Keep Family score and Family jar chips.
- Drop unused FamilyJarEntry import hide.

- [ ] **Step 4:** Update `parent_home_panel.dart`
- Delete `_addJar` and QuickAction 'Add 10 pts'.
- Pass ASK Score into `_ChildCard` via lookup on `_summary?.children`.
- `_ChildCard`: add askScore and streakDays; under age-band chip show `$askScore ASK · $streakDays day streak`.
- Keep ASK score / Family jar / Group jar stat row.

- [ ] **Step 5:** Delete `addJarEntry` from engagement_service.dart. If getFamilyJar is unused, you may leave it or delete it; do not leave compile errors. Re-run flutter test. dart analyze the three files.

- [ ] **Step 6:** Commit skip (not a git repo)
