/// Predefined nudge stickers only — no free text (prd.txt §4.4).
const nudgeMessages = <String, String>{
  'star_well_done': 'Well done — keep going!',
  'proud': 'I am proud of your dedication to God’s Word',
  'verse': 'Review your memory verse today',
  'quiz': 'Complete your weekly quiz',
  'streak': 'Keep your daily streak going',
  'praying': 'Praying for you today',
};

String messageForNudge(String stickerKey) =>
    nudgeMessages[stickerKey] ?? 'A cheer from your family';
