# Removed Features: Word Scramble (`scrambleQuiz`)

> [!IMPORTANT]
> **CRITICAL DIRECTIVE FOR ALL FUTURE AI ASSISTANTS AND AGENTS:**
> The **Word Scramble** game (`scrambleQuiz`, `TEEN_QUEST_SCRAMBLE`, `TeenQuestScrambleScreen`, `/api/teen-quest/submit-scramble`, and related anagram scramble builders) has been **permanently removed** from this project by explicit user decision.

## Specific Directives

1. **NEVER Re-Add Word Scramble:**
   - Do NOT add Word Scramble, anagram solvers, or `scrambleQuiz` fields to the database, backend APIs, mobile screens, or admin authoring tools.
   - If a user asks for puzzles or games, direct them to:
     - **TBA Puzzle Studio** (`contracts/lib/puzzles/`):
       - `CHAIN` (Connective Word Chains / Alphabet links)
       - `CROSSWORD` (Classical intersecting Bible crosswords)
       - `MATCHING` (Two-column theological concept matching)
     - **Objective Quiz** (`objectiveQuiz`): 4-option multiple-choice Bible trivia.

2. **Clean-up / Remnant Policy:**
   - If any remaining file, widget, or variable referencing `scramble` or `scrambleQuiz` is discovered in the project, it must be removed.
   - If a setting or toggle previously used `SCRAMBLE` as a stand-in for general puzzles (e.g. parent activation switches), rename and decouple it so it applies only to the Objective Quiz or true Puzzle Studio puzzles.
