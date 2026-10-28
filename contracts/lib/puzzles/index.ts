/**
 * Pure TypeScript puzzle core — no React / DOM imports.
 * Shared by Studio CLI, backend publish checks, and (via JSON Schema) Dart.
 */
export * from './schema.js';
export * from './validate.js';
export * from './compile.js';
export * from './drop.js';
export * from './snap.js';
export * from './publish.js';
export * from './matching-publish.js';
export * from './quest-game.js';
export { normalizeContentNames } from '../content-names.js';
