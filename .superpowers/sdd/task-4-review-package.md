# Review package Task 4

**Commits:** none

## Diff (engagement_service.dart)

- getFamilySummary demo: familyAskScore 42, familyJar 42, children Sam (DemoAccount.samId, 18, streak 3) + Grace (DemoAccount.childId, 24, streak 2), recent [].
- addJarEntry still present (controller override).
- getFamilyJar still present (maps response as List — API now returns {entries}; UI will stop calling in Task 5).
- New types FamilyChildScore, FamilyActivity, FamilySummary with children/recent/streaks defaults.

Analyzer: no issues on this file.
