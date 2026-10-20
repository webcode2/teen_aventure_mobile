# Verified codebase cleanup — 18 October 2026

## Method and scope

Reviewed import reachability from admin/backend/mobile entry points, test imports, Dart conditional platform exports, dependency imports, asset references and TypeScript/Dart unused-symbol diagnostics. Preserved existing unrelated work. No database records, migrations, uploaded content, credentials or operating-system caches were flushed.

## Removed

- Unreferenced admin `studio/NumberingStrip.tsx` component.
- Unreferenced admin `public/icons.svg` sprite.
- Unreachable Flutter `ActivityHistoryScreen`.
- Old `quest_world.webp` texture (411,844 bytes); the map uses `quest_world_light.webp` in both HTML and Dart document loading.
- Unused private `_advanceCursor` method; the active editable-cell advancement implementation remains.
- Unused `hive` and `hive_flutter` dependencies; offline dependency resolution removed exactly these two packages from the lockfile.
- Backend unused `pinSchema` import and three unused `reply` parameters.
- Regenerable Flutter build output and project tool caches via `flutter clean`, approximately 3.3 GB. Existing local APK outputs were included in that build cleanup. Rebuild when needed.

## Preserved deliberately

- Admin-controlled/conditional features, runtime routes and notification paths.
- Dart platform-specific implementations referenced through conditional exports.
- `lib/models/episode.dart`: test-support files import this model.
- Shared puzzle contracts, schema history, test fixtures, platform projects and all live data/backups.
- Tooling/type/peer dependencies: absence of a direct source import alone is insufficient evidence to delete them.
- Backend distribution output and running services: these can be operational dependencies.

## Verification

- Admin TypeScript check and production build passed. The final build excludes the removed public sprite.
- Backend TypeScript check with `--noUnusedLocals --noUnusedParameters` passed.
- All 86 Flutter tests passed.
- Flutter analysis passed with 73 informational lint findings, zero warnings and zero errors.
- Git whitespace checks passed for the root and backend repositories.
- Admin full test run: 78 passed, 5 failed across two files, plus one unhandled `scrollTo` error. Isolated rerun: the ministry portal tests passed; four App.test.tsx failures and the unhandled `scrollTo` error remained (15 passed / 4 failed in the two-file rerun). Failures involve expectations in existing UI tests; none of the removed modules/assets is referenced by these tests. This does not establish a passing admin test suite.
- Backend database integration tests were not run because their setup resets the configured database. No live data was modified.

The admin build still reports a 1.35 MB minified JavaScript chunk (about 369 KB gzip). Code splitting is a separate optimization, not evidence that its contents are unused. This cleanup does not claim proof that every remaining public export or externally invoked script is required, nor that all unused code can be identified statically. Production Vite/Dart optimization and Android minification/resource shrinking remain enabled.
