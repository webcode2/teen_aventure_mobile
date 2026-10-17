# Antigravity Workspace Guidelines: Teen Bible Adventures

## Architecture Overview
- `admin/`: Vite 8 + React 19 SPA (hash-based router `route.ts`, JWT bearer in `localStorage`).
- `backend/`: Fastify 5 REST API + Prisma 6 + PostgreSQL.
- `mobile_/`: Flutter teen discipleship mobile app (`package:teen_aventure`).
- `contracts/`: `@askhub/puzzle-contracts` shared Zod schemas and fixtures.

## Local memory
Project decisions live in `.cursor/rules/` (`ministry-account.mdc`, `dev-guardrails.mdc`, `open-plan.mdc`). They apply in every session on this workspace, including after a Cursor account switch. Do not move them into account-only memory.

## Permanent Behavioral Rules
1. **Removed Features — Word Scramble (`scrambleQuiz`)**:
   - The Word Scramble game (`scrambleQuiz`, `TEEN_QUEST_SCRAMBLE`, `TeenQuestScrambleScreen`, `/api/teen-quest/submit-scramble`) was permanently removed from the product **and the database**.
   - **Do NOT re-add Word Scramble or scrambleQuiz** (no column, enum, API, or UI).
    - Playable studio games: **Puzzle Studio** (scripture crossword) and **Match Studio** (pair / line-match). A quest week picks exactly one via `TeenQuest.gameType`. Do not reintroduce Word Scramble or Word Chains as separate play modes. Weekly lesson quizzes belong to **Objective Quiz** (`objectiveQuiz`).
   - See `.agents/rules/REMOVED_FEATURES.md` for full details.
