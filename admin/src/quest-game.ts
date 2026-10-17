import {
  normalizeQuestGameLink,
  questGameAttached,
  type QuestGameType,
} from '@askhub/puzzle-contracts';

export type { QuestGameType };
export { normalizeQuestGameLink, questGameAttached };

export type QuestGameOption = {
  id: string;
  title: string;
};

/** Labels shown in the quest editor and list. */
export function questGameStepLabel(gameType: QuestGameType): string {
  return gameType === 'MATCHING' ? 'Match' : 'Puzzle';
}

export function weekGameReady(input: {
  gameType?: QuestGameType | null;
  puzzleTitle?: string | null;
  matchingTitle?: string | null;
  puzzleId?: string | null;
  matchingId?: string | null;
}): { label: string; title: string; ready: boolean } {
  const link = normalizeQuestGameLink({
    gameType: input.gameType,
    puzzleId: input.puzzleId,
    matchingId: input.matchingId,
  });
  if (!link.ok) {
    return { label: 'Game', title: '', ready: false };
  }
  if (link.gameType === 'MATCHING') {
    const title = input.matchingTitle?.trim() || '';
    return {
      label: 'Match',
      title,
      ready: Boolean(link.matchingId && title),
    };
  }
  const title = input.puzzleTitle?.trim() || '';
  return {
    label: 'Puzzle',
    title,
    ready: Boolean(link.puzzleId && title),
  };
}
