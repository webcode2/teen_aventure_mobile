/** Quest week attaches exactly one playable game: scripture crossword or match pairs. */

export type QuestGameType = 'PUZZLE' | 'MATCHING';

export type QuestGameLinkInput = {
  gameType?: QuestGameType | null;
  puzzleId?: string | null;
  matchingId?: string | null;
};

export type QuestGameLinkOk = {
  ok: true;
  gameType: QuestGameType;
  puzzleId: string | null;
  matchingId: string | null;
};

export type QuestGameLinkFail = {
  ok: false;
  message: string;
};

/**
 * Normalize and validate the exclusive game link on a TeenQuest week.
 * Draft weeks may omit the attached id; both ids set is always rejected.
 */
export function normalizeQuestGameLink(input: QuestGameLinkInput): QuestGameLinkOk | QuestGameLinkFail {
  const gameType: QuestGameType = input.gameType === 'MATCHING' ? 'MATCHING' : 'PUZZLE';
  const puzzleId = input.puzzleId ?? null;
  const matchingId = input.matchingId ?? null;

  if (puzzleId && matchingId) {
    return { ok: false, message: 'A quest week can attach only one game' };
  }
  if (gameType === 'PUZZLE' && matchingId) {
    return { ok: false, message: 'Puzzle weeks cannot attach a match game' };
  }
  if (gameType === 'MATCHING' && puzzleId) {
    return { ok: false, message: 'Match weeks cannot attach a puzzle' };
  }

  return {
    ok: true,
    gameType,
    puzzleId: gameType === 'PUZZLE' ? puzzleId : null,
    matchingId: gameType === 'MATCHING' ? matchingId : null,
  };
}

/** Week game step is ready when the chosen type has an attached id. */
export function questGameAttached(link: QuestGameLinkOk): boolean {
  return link.gameType === 'PUZZLE' ? Boolean(link.puzzleId) : Boolean(link.matchingId);
}
