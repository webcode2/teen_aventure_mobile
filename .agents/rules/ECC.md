# Everything Claude Code (ECC) Standards & Guidelines

This workspace is configured with the Everything Claude Code (ECC) system from local `/home/bash/Desktop/ECC`.

## Core Workflow
1. **Plan before editing large features**: Map dependencies, outline components, and verify intent before making broad edits.
2. **Prefer test-first changes**: Write or run targeted tests before shipping bug fixes and new functionality.
3. **Review for security before shipping**: Check input boundaries, sanitize renders, and ensure sensitive tokens remain secure.
4. **Keep changes self-contained, readable, and easy to revert**: Avoid monolithic refactors when small, high-leverage edits achieve the goal.

## Coding Standards
- Prefer immutable updates over in-place mutation.
- Keep functions small and files focused.
- Validate external input at system boundaries.
- Never hardcode credentials, secrets, or environment tokens.
- Fail loudly with actionable error messages instead of silently swallowing exceptions.

## Security Checklist
Before any commit or delivery:
- No hardcoded API keys, passwords, or tokens.
- All external parameters and requests validated with schemas (e.g. Zod).
- Parameterized queries for database access.
- Sanitized HTML and safe string escapes.
- Authorization and authentication checked for sensitive routes.
- Error messages scrubbed of sensitive internals.

## Delivery & Commit Standards
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`
- Run targeted verification (tests, linter, builds) for touched areas before finishing tasks.
- Prefer clean local implementations over adding unnecessary external dependencies.
