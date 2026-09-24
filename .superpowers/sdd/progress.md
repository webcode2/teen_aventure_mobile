# SDD progress — 2026-08-29 platform production

Workspace is not a git repo; work in place, no commits.
Tasks 4.2 and 4.3 are operator-blocked (hosting/Play Console).

- Task 1.1: complete — AuthGate, login/register/PIN/teen, widget tests
- Task 1.2: complete — JWT /me shells (parent/teacher/teen)
- Task 1.3: complete — Profile deletion + 0-30/30-90/90+ copy
- Tasks 2.1–2.6: complete — Growth Hub screens + marinade/bible tests
- Task 2.7: complete — Admin marinade/prayer/life-prayer + BIY example quiz
- Task 3.1: complete — BIY from VideoProvider + BIY_VIDEO/BIY_QUIZ submit
- Task 3.2: complete — quest reader, activation status card, live submit, teacher live status + class picker, Rewards leaderboard from API, admin question/scramble builders
- Task 3.3: complete — live score chip, family/group jar, Together, parent send + teen nudge inbox (mark-read), GET /family/jar
- Task 3.4: complete — Parent safeguarding report UI
- Task 4.1: complete — teacher reflection leak test; Flutter AuthGate + hub tests
- Task 4.2: in-repo slice — production JWT_SECRET ≥ 32; hosting/TLS still operator
- Task 4.3: skipped (operator)

Verification (Milestone 3 remainder): flutter test 37/37; admin 6/6; backend 53/53.

# SDD progress — 2026-08-30 engagement jars

Workspace is not a git repo; work in place, no commits.

- Task 1: complete (working-tree extract applyStreak → backend/src/lib/streak.ts, review clean). Tests not fully verified (askhub_test DB missing).
- Task 2: complete (ledger family/group jar, POST 410, 63/63 api tests, review clean). Minor: group-jar test does not assert exact total.
- Task 3: complete (teen-quest applyStreak, 63/63, review clean).
- Task 4: complete (FamilySummary children/recent, demo 42=18+24, review clean).
- Task 5: complete (parent UI: Family score + Family jar, child ASK on cards, Add 10 pts removed, addJarEntry/getFamilyJar deleted). Flutter tests not run here (flutter not in PATH).

# SDD progress — 2026-09-24 admin path routing

Workspace: ask_teens_app (dirty tree). Do not commit unless user asks.
Plan: docs/superpowers/plans/2026-09-24-admin-path-routing.md

Task 1: complete (no commit; react-router + path-helpers; review: Important re zod/tailwind adjudicated pre-existing dirty tree — not Task 1)
Task 2: complete (no commit; guards+router+tests; review Approved)
Task 3: complete (no commit; App+main BrowserRouter; tsc clean)
Task 4: complete (no commit; shell+top-nav useNavigate)
Task 5: complete (no commit; call sites migrated; tsc clean; verified on resume)
Task 6: complete (no commit; MemoryRouter tests 23/23)
Task 7: complete (no commit; Fastify /app+/groups + legacy redirects)
Task 8: complete (no commit; 23/23 + build PASS; manual checklist unverified)
Final review fixes: assets static + reset link path; 23/23
Option 1 blocked (merge to main skipped). Landed commits on feat/admin-path-routing (+ backend feat/admin-path-routing-spa).
