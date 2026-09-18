# TBA client review — implementation plan

Source: `Teen Bible Adventures App review.txt`  
Status: Phase 5–6 done (clear parts)

**Sep 2026:** Stale church/teacher Flutter app code was purged from `mobile/` (family + teen surfaces only). Backend church APIs remain for admin/dashboard use.

## How this is split

| Bucket | Rule |
|--------|------|
| **Clear — build** | Spec is specific enough to implement without guessing product rules |
| **Pending — circle back** | Asset missing, table incomplete, or the client asked a question we should not invent |

---

# A. Clear specs — implement

## Phase 1 — Login & account model (done)

**Goal:** Login only for people who can have independent accounts. Children enter after a parent session, Netflix-style.

### 1.1 Slim the login page
- Keep **Adult** (email + password) and **Teen 16–19** (independent login).
- Remove from login: **Create a family account**, **Demo roles**, under-age PIN as a public entry.
- After Adult login, offer **Create a family / Join a church** in-app (not pre-auth).
- Adult signup creates an adult account only (no family required at register).

### 1.2 Netflix-style child profiles (after parent login only)
- After parent auth, show family child avatars.
- Child taps their profile → enters **personal PIN**.
- Under-age children cannot create or see accounts on the public login page.
- Parent can continue as themselves from the same picker.
- Parent can set each child’s PIN from Family.

### 1.3 Independent users still belong to groups
- Adults and teens 16–19 stay independently logged in.
- They can still belong to family/group/church; scores still roll into that leaderboard.

### 1.4 No church self-create
- Adult signs up as a normal adult.
- Church Lead is **admin-upgraded** after verification (dashboard).
- App users cannot `POST /api/churches`. Church create stays on the admin dashboard.

## Phase 2 — Join family / group / church (done)

- After independent signup/login: **Scan QR** or **accept email invite**.
- Cap: **max 5 groups/families per user.**
- Adults can create groups/families; teens can leave invited groups but cannot create them.
- Church linked through a family does not use an extra cap slot. Church class groups do.
- Groups live under Explorer Home → Groups, Account → Groups, Family Invite/Join, and Teacher → Invite to this group.

## Phase 3 — Teen IA (tabs) (done)

| Tab | What shipped |
|-----|---------------------------|
| **Home** | Current explorer dashboard |
| **Achievements** | Streak, points jar, chapters done, New Quester / Ardent Reader / Great Follower (later titles wait for the full table) |
| **Quest** | Journey-map restyle of the week feed (no Candy Crush art; Guided vs Dynamic not invented) |
| **Groups** | Memberships, leave, group ranks |

Bible stays in the drawer. Account stays as a tab until the client says to drop it.

## Phase 4 — Content plumbing (done)

- Live jar points: **video 10**, **quiz/puzzle 5**, **prayer 1** until confirmed. Completing the activity awards that total (not a sum of question points).
- Video completion posts to `POST /api/engagement/complete` (`VIDEO_WATCH`). Prayer uses the same route (`PRAYER_DECLARATION`) when that UI exists.
- Thumbnails: official Drive/asset URL on `thumbnailUrl` first; otherwise YouTube `hqdefault` for **that** video. No invented TBA art.
- Abi & Zach stay at `assets/abi_shot.svg` / `assets/zack_ful.svg` for an in-place Drive drop-in.

## Phase 5 — Parent (done)

- Facilitator/teacher feedback lives on parent Home (`Teacher feedback`) and the bell inbox (receive only).
- Jar copy: totals from completed videos, quizzes, and puzzles. Purpose still pending (P6).

## Phase 6 — Teacher app surface removed

- Backend keeps `TEACHER` (and other church roles) on `/me`, class assignment, quiz activate, and class-message APIs.
- The app no longer has teacher home, roster, compose, home switcher, demo teacher login, quest preview, curated-picks reorder, or teacher full-name leaderboard.
- Adults land on the parent shell.

## Church data hidden in the app (for now)

- The app is family-only: no church join/leave, church invite, church classes, church curriculum track, church role on Account, or teacher/class-message inbox.
- Backend church APIs and roles stay in place. Church and church-class invites are rejected in the join screen.

## Suggested remaining order

```text
Phase 1  Login slim + adult register + Netflix picker + no church self-create  (done)
Phase 2  Max-5 + email invite + QR  (done)
Phase 3  Teen tabs + Groups  (done)
Phase 4  Official art drop-in + thumbnails + live points  (done)
Phase 5–6  Parent/teen receive class notes; teacher UI removed (role stays on backend)
```

---

# B. Pending — circle back (do not invent)

| ID | Item | Why pending |
|----|------|-------------|
| P1 | Official Abi & Zach files | Drive folder not imported yet |
| P2 | Video thumbnail filenames | Rejoice to rename |
| P3 | 52-week puzzles & quizzes | Link/content missing |
| P4 | Full milestone table | Only partial titles/criteria |
| P5 | Prayer declaration points | “point” is not a number |
| P6 | Parent jar purpose | Client asked what it is for |
| P7 | Guided vs Dynamic quest | Named, not defined |
| P8 | Candy Crush map art | No tiles/assets |
| P9 | Weekly curriculum message pack | Guide copy not attached |
| P10 | Age 16–19 verification | DOB vs self-declare |
| P11 | Group vs family vs church vs class | Ambiguous |
| P12 | Keep or drop Bible / Account tabs | Not confirmed |
| P13 | Login Netflix reference image | Missing from the .txt |

---

# C. Questions for the client

1. Confirm independent login is only Adult + Teen 16–19.
2. How do we verify 16–19 (DOB vs checkbox)?
3. What is a **group** vs family vs church class? Max 5 applies to which?
4. What is the **Jar** for?
5. Send milestone table, puzzle/quiz pack, renamed thumbnails, Abi/Zach files, login reference image.
6. Prayer declaration = how many points?
7. Should teen nav replace Bible/Account or sit beside them?
