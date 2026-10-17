# Removed Features: Word Scramble (`scrambleQuiz`)

> [!IMPORTANT]
> **CRITICAL DIRECTIVE FOR ALL FUTURE AI ASSISTANTS AND AGENTS:**
> The **Word Scramble** game (`scrambleQuiz`, `TEEN_QUEST_SCRAMBLE`, `TeenQuestScrambleScreen`, `/api/teen-quest/submit-scramble`, and related anagram scramble builders) has been **permanently removed** from this project by explicit user decision.

## Specific Directives

1. **NEVER Re-Add Word Scramble:**
   - Do NOT add Word Scramble, anagram solvers, or `scrambleQuiz` fields to the database, backend APIs, mobile screens, or admin authoring tools.
    - If a user asks for puzzles or games, direct them to:
     - **TBA Puzzle Studio** — scripture crossword (`CROSSWORD`). Authoring may use internal WIP shapes (CHAIN/LAYOUT); do not expose Word Chains as a separate play mode.
     - **Match Studio** — pair / line-match game (`MATCHING`). A quest week chooses **either** Puzzle or Match (`TeenQuest.gameType`).
     - **Objective Quiz** (`objectiveQuiz`): 4-option multiple-choice Bible trivia.

2. **Clean-up / Remnant Policy:**
   - Database remnants are removed: no `TeenQuest.scrambleQuiz` column, no `ActivityType.TEEN_QUEST_SCRAMBLE`, no `submit-scramble` route, no SCRAMBLE/BOTH activation types.
   - If any remaining file, widget, or variable referencing `scramble` or `scrambleQuiz` is discovered in the project, it must be removed.
   - Class quiz activation is objective-quiz only (`OBJS`).
