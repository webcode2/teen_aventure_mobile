# Teen Bible Adventures — feature checklist

Inventory of product features evidenced in `admin/`, `mobile_/`, `backend/`, and `contracts/`. Ordered smallest → largest. Check items as you verify or ship.

Do not re-add Word Scramble / `scrambleQuiz` (permanently removed). See `.agents/rules/REMOVED_FEATURES.md`.

---

## Tiny / atomic

- [ ] Copy join code
- [ ] Regenerate church join code
- [ ] Share QR
- [ ] Print QR (QR image only on the print page)
- [ ] Copy join link / payload
- [ ] 1D barcode vs 2D QR toggle (shared pass UI)
- [ ] Torch / retry on invite QR scan
- [ ] Double-back to exit (mobile)
- [ ] Pull-to-refresh explorer home
- [ ] Offline indicator on home
- [ ] Mark nudge read
- [ ] Clear all nudges
- [ ] Dismiss one nudge
- [ ] Enable / disable account
- [ ] Remove FCM device token
- [ ] Mark church application seen
- [ ] Published vs draft site page toggle
- [ ] Copy public `/p/{slug}` link
- [ ] Demo account quick-fill on staff login
- [ ] Welcome onboarding dialog (once)
- [ ] Gem spend for puzzle hint
- [ ] Word Declaration: tap 10× for prayer points
- [ ] Locked-level snackbar on quest map
- [ ] Under-15 register block
- [ ] Terms checkbox on register
- [ ] Ministry profile: email read-only
- [ ] Ministry verify: 5-letter hashed code (never returned in API)
- [ ] `appLogin: false` blocks mobile login
- [ ] Max 5 memberships
- [ ] Investigation lock extends deletion retention
- [ ] Score uniqueness (e.g. video once)
- [ ] Activity buckets (day / month / year chart keys)

---

## Small UI / account actions

- [ ] Edit name, email, password, birth year
- [ ] Avatar presets
- [ ] Set / use child 4-digit PIN
- [ ] Parent switch into under-age child
- [ ] Teen PIN login after parent session
- [ ] Back to parent account
- [ ] Enable teen independent login
- [ ] Teen → adult transition
- [ ] Add child (0–14) / teen (15–19) to family
- [ ] Auto-create family on first explorer
- [ ] Family jurisdiction
- [ ] Add guardian
- [ ] Leave church / leave class (church leave cascades enrollments)
- [ ] Approve / reject class enrollment
- [ ] Assign teacher to class
- [ ] Restrict / reactivate church team access
- [ ] Update church leadership titles / roles
- [ ] Register teacher from ministry
- [ ] Submit / resubmit church nudge template
- [ ] Approve / reject / revoke / re-approve nudge templates
- [ ] Platform cheer registration (admin Care)
- [ ] Safeguarding status change + pastoral note
- [ ] Restore family in recoverable deletion window
- [ ] Cancel family / group scheduled deletion
- [ ] Schedule or immediate group deletion
- [ ] Create optional 14-day email invite
- [ ] Invite preview then accept
- [ ] Forgot / reset password (staff)
- [ ] Staff login + safe `next` redirect
- [ ] Collapsible sidebar + mobile drawer + nav badges
- [ ] Header bell → notifications; “+ New quest”
- [ ] Filter users / pastors / staff by status or role
- [ ] Search directories (users, churches, groups, quests…)
- [ ] Promote STAGED puzzle / match → LIVE
- [ ] Delete draft / staged / LIVE when detachable
- [ ] CMS image upload / clear (Abi / Zach)
- [ ] Consent packs by jurisdiction (accept / status)
- [ ] Media upload + presigned read

---

## Mid-size features

### Public web

- [ ] Landing (CMS hero, pillars, quests pitch, store badges, demo join pass)
- [ ] About page
- [ ] Contact page (+ FAQ)
- [ ] Privacy page
- [ ] Terms page
- [ ] Generic public site page `/p/:slug`
- [ ] Legacy redirects into `/ministry`

### Auth & identity

- [ ] Parent register / login
- [ ] Teen register / teen-login (Sign-in fallback after parent 401/429)
- [ ] Birth-year gate (teen vs adult vs under 15)
- [ ] Platform roles: MAIN_ACCOUNT, CHILD, CHURCH_APPLICANT, desk admins
- [ ] Church roles: PASTOR, TEACHER, CHAPERONE, CHILDRENS_CHURCH_LEAD, PASTOR_NOMINEE
- [ ] Leadership titles: Pastor, Ministry leader, Youth worker, Children’s ministry lead, Teacher

### Family & explorer

- [ ] “Who is on the Quest?” picker
- [ ] Family circle: explorers, ASK points, jars, streaks
- [ ] Parent cheer from approved templates
- [ ] Family deletion request + lifecycle messaging
- [ ] Profile Week / Month / Year activity chart
- [ ] Achievements / milestones (incl. Ardent Reader badge)

### Groups & ministry link

- [ ] Memberships: FAMILY / CHURCH / CLASS
- [ ] Join via QR / paste / durable church & class codes
- [ ] Create custom group (adults)
- [ ] Class enrollments PENDING → APPROVED / REJECTED
- [ ] Class leaderboard / standing
- [ ] Cheer one / Cheer all
- [ ] Church join for families and standalone teens (`family.churchId`)
- [ ] Broadcast class messages to enrollments + church-linked congregation

### Learning loop (mobile)

- [ ] Today’s Quest card (passage, videos, quiz, game step)
- [ ] Browse weeks
- [ ] Quest journey map
- [ ] 3 lesson videos (watch → points)
- [ ] Objective Quiz (MC + fill-blank; practice if done)
- [ ] Scripture crossword (timer, clues, gems, win / claim)
- [ ] Match game when week `gameType` is matching
- [ ] Sequential unlock: video → quiz → puzzle / match

### Inbox & push

- [ ] Nudges / encouragements inbox
- [ ] Group deletion notices
- [ ] FCM register / Devices screen
- [ ] Admin outbox: Push / Email + history

### Safeguarding

- [ ] Report issue: App vs Church, anonymous, follow-up email
- [ ] Ministry Care console
- [ ] Admin reports list / detail
- [ ] Statuses SUBMITTED → UNDER_REVIEW → ESCALATED → CLOSED

---

## Large product surfaces

### App Manager dashboard

- [ ] Overview KPIs + community snapshot
- [ ] **Users** directory (mobile-app accounts only; omits admins, pastors, no-app accounts) + Children + Families
- [ ] **Pastors** directory
- [ ] **Staff** under Settings (desk admins)
- [ ] Churches + ministry applications (create, review, approve / reject, detail roster)
- [ ] Groups list / detail (members, teachers, QR)
- [ ] Notifications compose + history
- [ ] Quest weeks editor (Lesson → Videos → Quiz → Puzzle / Match → Review)
- [ ] Puzzle Studio + library (draft / staged / live)
- [ ] Match Studio + library
- [ ] Mobile + Web Content CMS
- [ ] Site pages (legal / CMS)
- [ ] Student nudges Care queue
- [ ] Deletions console
- [ ] Quest points & award milestones

### Ministry portal (`/ministry`)

- [ ] Account → verify → apply (until approved)
- [ ] Unverified welcome (no empty KPIs / groups)
- [ ] Apply form (ministry fields, identity number, terms)
- [ ] Profile drawer
- [ ] Ops pages: Families, Groups, Team, Nudges, Care
- [ ] Group create, roster approve, streaks / activity, teacher assign, QR pass
- [ ] Team register / roles / restrict
- [ ] Nudge template submit for Teen Bible Adventures review
- [ ] Care incidents

### Teen Quest platform

- [ ] Weeks with scripture, content, declaration, 3 videos, objective quiz
- [ ] Exactly one live game: crossword **or** matching
- [ ] Class activate / deactivate Objective Quiz
- [ ] Scoring: video, quiz, puzzle, prayer + badges / streaks
- [ ] Class quiz leaderboard

---

## Largest pillars

- [ ] **Discipleship content engine** — Quest weeks + Puzzle Studio + Match Studio + scoring / awards
- [ ] **Family & explorer accounts** — parents, children, standalone teens, PINs, switches, achievements
- [ ] **Ministry & groups** — applications, churches, classes, enrollments, join passes, team, broadcasts / nudges
- [ ] **Mobile explorer app** — daily quest loop, map, scores, groups, inbox, push, reports
- [ ] **Care & trust** — safeguarding, deletions lifecycle, consent, privacy / terms, portal-only ministry logins
- [ ] **Operator desks** — App Manager CMS / ops + Ministry portal operations

---

## Explicitly out of product

- [x] Word Scramble / scramble quiz — permanently removed (do not re-add)
- [x] Freeform church-wide broadcast typing — cheers use approved templates only
- [x] Offline video download — UI gated off in store config
- [ ] Class-messages API exists; no dedicated mobile inbox screen wired yet

---

## Notes

- Applicant-facing name is **ministry**; data model / admin Churches page keep Church naming.
- Ministry portal URL is `/ministry` (not a separate `/groups` product URL).
- Live scoring defaults (do not overwrite via seed while testing): video 7, quiz 3, puzzle 3, prayer 1; award durations 1, 1, 4.
