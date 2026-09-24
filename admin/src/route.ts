export const TABS = [
  "dashboard",
  "people",
  "churches",
  "groups",
  "weeks",
  "quests",
  "puzzles",
  "notifications",
  "consent",
  "reports",
  "deletions",
  "scoring",
] as const;

export type Tab = (typeof TABS)[number];
