export const TABS = [
  "dashboard",
  "people",
  "pastors",
  "staff",
  "churches",
  "groups",
  "quests",
  "puzzles",
  "matching",
  "content-mobile",
  "content-web",
  "legal",
  "cheers",
  "notifications",
  "reports",
  "deletions",
  "scoring",
  "archive",
] as const;

export type Tab = (typeof TABS)[number];
