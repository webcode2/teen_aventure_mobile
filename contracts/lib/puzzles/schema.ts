import { z } from 'zod';

/** Envelope schemaVersion for TBA Puzzle Studio contracts. */
export const SCHEMA_VERSION = 1 as const;

export const rewardsSchema = z
  .object({
    points: z.number().int().nonnegative().optional(),
    badgeKey: z.string().min(1).optional(),
    jarPoints: z.number().int().nonnegative().optional(),
  })
  .strict();

export const directionSchema = z.enum(['across', 'down']);

/** Normalize authoring answers: strip spaces/hyphens, uppercase A–Z. */
export function normalizeAnswer(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '');
}

export const answerSchema = z
  .string()
  .min(1)
  .transform(normalizeAnswer)
  .pipe(z.string().min(1).regex(/^[A-Z]+$/, 'answer must contain A–Z letters'));

/** Canonical placed crossword entry. */
export const crosswordEntrySchema = z
  .object({
    id: z.string().min(1),
    number: z.number().int().positive(),
    direction: directionSchema,
    row: z.number().int().nonnegative(),
    col: z.number().int().nonnegative(),
    answer: z.string().min(1).regex(/^[A-Z]+$/),
    clue: z.string().min(1, 'clue must be non-empty'),
    ref: z.string().min(1, 'ref must be a non-empty scripture reference'),
  })
  .strict();

export const crosswordLinkSchema = z
  .object({
    fromEntryId: z.string().min(1),
    toEntryId: z.string().min(1),
    letterIndex: z.number().int().positive(),
  })
  .strict();

export const crosswordDataSchema = z
  .object({
    grid: z
      .object({
        rows: z.number().int().positive(),
        cols: z.number().int().positive(),
      })
      .strict(),
    entries: z.array(crosswordEntrySchema).min(1),
    links: z.array(crosswordLinkSchema).optional(),
  })
  .strict();

export const matchingPairSchema = z
  .object({
    left: z.number().int().nonnegative(),
    right: z.number().int().nonnegative(),
  })
  .strict();

export const matchingDataSchema = z
  .object({
    prompt: z.string().min(1),
    ref: z.string().min(1),
    leftColumn: z.array(z.string().min(1)).min(2),
    rightColumn: z.array(z.string().min(1)).min(2),
    correctPairs: z.array(matchingPairSchema).min(1),
  })
  .strict();

const envelopeBase = {
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: z.string().min(1),
  title: z.string().min(1),
  scripture: z.string().min(1),
  rewards: rewardsSchema,
};

export const crosswordEnvelopeSchema = z
  .object({
    ...envelopeBase,
    type: z.literal('CROSSWORD'),
    data: crosswordDataSchema,
  })
  .strict();

export const matchingEnvelopeSchema = z
  .object({
    ...envelopeBase,
    type: z.literal('MATCHING'),
    data: matchingDataSchema,
  })
  .strict();

/** WIP chain step — connective alphabet authoring (no absolute coords yet). */
export const chainStepSchema = z
  .object({
    id: z.string().min(1),
    answer: z.string().min(1),
    direction: directionSchema,
    clue: z.string().min(1, 'clue must be non-empty'),
    ref: z.string().min(1, 'ref must be a non-empty scripture reference'),
    /** 1-based letter of previous answer where this step begins. Omit on first. */
    fromLetter: z.number().int().positive().optional(),
  })
  .strict();

export const chainDataSchema = z
  .object({
    steps: z.array(chainStepSchema).min(1),
  })
  .strict();

export const chainEnvelopeSchema = z
  .object({
    ...envelopeBase,
    type: z.literal('CHAIN'),
    data: chainDataSchema,
  })
  .strict();

/** WIP layout — absolute coords; numbers ignored (recomputed on compile). */
export const layoutEntrySchema = z
  .object({
    id: z.string().min(1),
    direction: directionSchema,
    row: z.number().int().nonnegative(),
    col: z.number().int().nonnegative(),
    answer: z.string().min(1),
    clue: z.string().min(1, 'clue must be non-empty'),
    ref: z.string().min(1, 'ref must be a non-empty scripture reference'),
    /** Optional draft number — discarded by compile(). */
    number: z.number().int().positive().optional(),
  })
  .strict();

export const layoutDataSchema = z
  .object({
    grid: z
      .object({
        rows: z.number().int().positive().optional(),
        cols: z.number().int().positive().optional(),
      })
      .strict()
      .optional(),
    entries: z.array(layoutEntrySchema).min(1),
    links: z.array(crosswordLinkSchema).optional(),
  })
  .strict();

export const layoutEnvelopeSchema = z
  .object({
    ...envelopeBase,
    type: z.literal('LAYOUT'),
    data: layoutDataSchema,
  })
  .strict();

export const puzzleEnvelopeSchema = z.discriminatedUnion('type', [
  crosswordEnvelopeSchema,
  matchingEnvelopeSchema,
  chainEnvelopeSchema,
  layoutEnvelopeSchema,
]);

export type Rewards = z.infer<typeof rewardsSchema>;
export type Direction = z.infer<typeof directionSchema>;
export type CrosswordEntry = z.infer<typeof crosswordEntrySchema>;
export type CrosswordLink = z.infer<typeof crosswordLinkSchema>;
export type CrosswordData = z.infer<typeof crosswordDataSchema>;
export type MatchingData = z.infer<typeof matchingDataSchema>;
export type ChainStep = z.infer<typeof chainStepSchema>;
export type ChainData = z.infer<typeof chainDataSchema>;
export type LayoutEntry = z.infer<typeof layoutEntrySchema>;
export type LayoutData = z.infer<typeof layoutDataSchema>;
export type CrosswordEnvelope = z.infer<typeof crosswordEnvelopeSchema>;
export type MatchingEnvelope = z.infer<typeof matchingEnvelopeSchema>;
export type ChainEnvelope = z.infer<typeof chainEnvelopeSchema>;
export type LayoutEnvelope = z.infer<typeof layoutEnvelopeSchema>;
export type PuzzleEnvelope = z.infer<typeof puzzleEnvelopeSchema>;
export type WipEnvelope = ChainEnvelope | LayoutEnvelope;
