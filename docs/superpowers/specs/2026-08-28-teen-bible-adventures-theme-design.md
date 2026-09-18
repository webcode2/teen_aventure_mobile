# Teen Bible Adventures Mobile Theme Redesign

**Date:** 2026-08-28  
**Source of truth:** WhatsApp mockups in the repo root:

- `WhatsApp Image 2026-08-28 at 9.25.20 AM.jpeg` (home + labeled palette)
- `WhatsApp Image 2026-08-28 at 9.26.13 AM.jpeg` (home dashboard)
- `WhatsApp Image 2026-08-28 at 9.26.32 AM.jpeg` (quest quiz)

## Goal

Rebuild the Flutter mobile visual system so the student home and quiz screens match those mockups: navy adventure chrome, cream parchment canvas, orange CTAs, green progress, teal accents, gold rewards, and Abi/Zach mascots.

Existing student/teacher/parent features stay. They restyle into this visual language; teacher/parent controls move into the hamburger drawer so they do not break the mockup layout.

## Palette (exact mockup hex)

| Token | Hex | Use |
|---|---|---|
| Navy | `#173B5C` | Header, footer, headings, body text |
| Cream | `#FFF4DC` | Screen background, cards, on-navy text |
| Orange | `#E87524` | Primary CTA, active Home tab, Friends tool, hearts |
| Forest green | `#2F7D5A` | Progress bars, streak banner, verse refs, correct state |
| Gold | `#F4B942` | Stars, trophies, 7-day badge, Rewards icon |
| Teal | `#159A9C` | Bible Puzzles, Journal, View All, Quests tab, Q-badge |
| Heart empty | `#704A2E` | Unused life outline |
| Correct fill | `#E9F4EC` | Selected correct answer |
| Answer fill | `#FFFDF7` | Unselected answer chips |

Corner radius: 20–24px on cards; 12–16px on chips/buttons. Bottom nav is solid navy.

## Screens in scope

### Home (student explorer)

1. Navy header: menu, “Teen Bible Adventures” ribbon logo, bell with badge `3`.
2. Greeting “Hey, Explorer!” + subtitle, Abi (green hoodie + Bible) and Zach (orange shirt + map) on a mountain scene.
3. Cream progress card: Bible-in-a-Year Quest, Week N of 52, green bar.
4. Verse blockquote with oversized navy quotes (Psalm 119:105).
5. Today’s Quest navy card: reading range, subtitle, orange “Start Reading”, path/castle scene with week signpost.
6. Your Adventure Tools: 5 cream tiles (Puzzles, Quest Map, Achievements, Journal, Friends) + teal View All.
7. Green streak banner: day circles, gold “7 Days” star.
8. Navy bottom nav: Home, Bible, Quests, Rewards, Profile.

### Quiz (quest)

1. Navy header with back, logo, gold coin + count.
2. Quest title, week subtitle, segmented 28/52 bar, 3 hearts.
3. Parchment question card: teal Qn + passage chips, bookmark, A–D answers, green correct state.
4. Correct banner with explanation + verse, Read Verse (teal outline) + Next Question (orange).
5. Same bottom nav; Quests tab active.

## Approach

Recommended: **layout rebuild of home + quiz, token remap everywhere else.**

- Do not only swap colors. The current teal-gradient chrome and list-card student home do not match.
- Do not drop teacher/parent. Put the role switcher in the header drawer.
- Map bottom nav to existing screens: Home = explorer, Bible = current week videos, Quests = quiz/puzzle, Rewards = leaderboard, Profile = parent audit / roster by role.

## Out of scope

Pixel-perfect 3D character renders if source PSDs are unavailable; Flutter-painted / generated mascots matching pose, wardrobe, and color. New product features (real friends, journal backend). Admin web theme.
