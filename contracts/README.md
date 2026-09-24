# TBA Puzzle Contracts

Shared source of truth between TypeScript (Studio / API) and Dart (teen app).

## Layout

```
contracts/
  lib/puzzles/          # PURE TS — no React
    schema.ts           # CHAIN | LAYOUT | CROSSWORD | MATCHING envelopes
    validate.ts         # validateChain, validateLayout
    compile.ts          # WIP → canonical CROSSWORD (position numbering)
    drop.ts             # anchorCandidates, evaluateDrop / DropEval
  fixtures/
    valid/              # wilderness, jael, esther
    broken/             # types_shadows, collision, no_crossing, empty_ref
    canonical/          # compile() goldens (npm run golden)
  json-schema/          # exported for Dart reference
  MANIFEST.json         # sha256 of fixtures + schemas
  scripts/validate-cli.ts
```

## Commands

```bash
cd contracts
npm install
npm test
npm run validate -- fixtures/valid --expect-pass
npm run validate -- fixtures/broken --expect-fail
npm run prepare:all   # json-schema + goldens + MANIFEST + sync Dart vendored copy
```

## Content source

Fixtures are drawn from `TBA puzzles/crosswords ideas - Raw` (wilderness, Jael, Esther, Types & Shadows).
