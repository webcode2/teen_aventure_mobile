# Home quest layout

**Date:** 2026-09-25
**Status:** Approved, not implemented
**Scope:** Flutter Home "Today's Quest" and the app-wide font bump. Week-detail layout, family groups, and the bottom nav layout stay as they are.

## Goal

Home currently shows only the next quest step, so two of the three videos disappear until earlier steps are finished. Show all three videos at once, keep a single thumbnail, and keep the quiz and puzzle visible but locked until every video has been watched. Reduce the app-wide font bump from +3 to +1.

## Decisions

| Decision | Choice |
|----------|--------|
| Thumbnail | Video 1 only, existing thumbnail card |
| Videos 2 and 3 | Same row widget as the quiz, with a play icon and the video title |
| Play order | Any video, including rewatch |
| Quiz and puzzle | Visible immediately. Both open only after all 3 videos are watched. They turn on together |
| After a video ends | Return to Home. Do not open the next video, quiz, or puzzle |
| After the quiz ends | Existing handoff may still open the puzzle |
| Progress | A set of watched video indexes. Skipping a video does not mark the earlier ones watched |
| Font | `kAppFontBump` changes from 3 to 1. No other font sizes change |

## Home layout

The rows use `SampleEpisodes.week1Package`, the same week Home uses today. Today's Quest always shows these rows, in order:

1. Video 1. The existing thumbnail card. Play stays on the card. The large line stays the week passage. The smaller line is that video's title.
2. Video 2. `AdventureListCard`, play icon, title is `VideoLesson.title`.
3. Video 3. Same row as video 2.
4. Quiz row. Opacity 0.45 while locked.
5. Puzzle row. Opacity 0.45 while locked.

The five rows stay on screen. Home does not replace them with a single next-step card. When all five steps are done, a short "You're caught up" line sits under the rows.

## Unlock and taps

- A video tap opens that video.
- A locked quiz tap shows "Finish all 3 videos to open the quiz." and does not navigate.
- A locked puzzle tap shows "Finish all 3 videos to open the puzzle." and does not navigate.
- When three distinct videos are watched, both rows accept taps. The quiz opens the quiz. The puzzle opens the puzzle. Finishing the quiz is not required before the puzzle can open.

## Progress

`GameController.completeVideoPart` records that part index only and awards points once per index.

- `weekVideosDone` is how many of indexes 0, 1, and 2 are in the set.
- `completedVideoParts` stays the longest finished prefix (0, then 1, then 2). Week detail uses that prefix, so a skipped video is not treated as watched there.

Watching video 3 first leaves the prefix at 0 and the watched count at 1. After videos 1, 2, and 3, the watched count is 3 and the quiz and puzzle open.

## Wiring

- `TodaysQuestSlide` renders the five rows from the week package and quest progress.
- `WeekQuestFlow` adds `openVideo`, `openQuiz`, and `openPuzzle`. Home stops sending every tap through `openNext`.
- The video screen returns to Home when the video finishes, instead of calling `openNext`.
- `kAppFontBump` in `mobile_/lib/theme.dart` is 1.

## Test

`mobile_/test/home_quest_progress_test.dart` covers `GameController`:

- `completeVideoPart(2)` leaves `completedVideoParts` at 0 and `weekVideosDone` at 1.
- After `completeVideoPart(0)`, `completeVideoPart(1)`, and `completeVideoPart(2)`, `weekVideosDone` is 3.
- Calling the same index twice does not award points twice.

## Out of scope

- Week-detail screen layout and its sequential video lock.
- Family group create, invite, and leave.
- Bottom nav structure. Its labels only change because the global bump drops by 2.
