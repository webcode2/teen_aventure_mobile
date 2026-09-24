# Antigravity Workspace Guidelines: ASK Hub / Teen Bible Adventures

## Architecture Overview
- `admin/`: Vite 8 + React 19 SPA (hash-based router `route.ts`, JWT bearer in `localStorage`).
- `backend/`: Fastify 5 REST API + Prisma 6 + PostgreSQL.
- `mobile_/`: Flutter teen discipleship mobile app (`package:teen_aventure`).
- `contracts/`: `@askhub/puzzle-contracts` shared Zod schemas and fixtures.

## Permanent Behavioral Rules
1. **Removed Features — Word Scramble (`scrambleQuiz`)**:
   - The Word Scramble game (`scrambleQuiz`, `TEEN_QUEST_SCRAMBLE`, `TeenQuestScrambleScreen`, `/api/teen-quest/submit-scramble`) was permanently removed from the product.
   - **Do NOT re-add Word Scramble or scrambleQuiz.**
   - All puzzle features belong to the **TBA Puzzle Studio** (`CHAIN`, `CROSSWORD`, `MATCHING`), and weekly lesson quizzes belong to **Objective Quiz** (`objectiveQuiz`).
   - See `.agents/rules/REMOVED_FEATURES.md` for full details.
