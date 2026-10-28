export type PastedWord = { answer: string; clue: string; ref: string };

/** Plain lists use commas/newlines; structured rows use tabs or pipes. */
export function parsePastedWords(text: string): { words: PastedWord[]; errors: string[] } {
  const words: PastedWord[] = [];
  const errors: string[] = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const structured = /[\t|]/.test(line);
    const entries = structured ? [line] : line.split(',');
    for (const entry of entries) {
      if (!entry.trim()) continue;
      const [raw = '', clue = '', ref = '', ...extra] = structured ? entry.split(/[\t|]/) : [entry];
      const answer = raw.trim().toUpperCase();
      if (!/^[A-Z]{1,24}$/.test(answer) || extra.length) {
        errors.push(`Line ${index + 1}: use an answer of 1–24 letters and up to three columns.`);
        continue;
      }
      words.push({ answer, clue: clue.trim(), ref: ref.trim() });
    }
  }
  return { words, errors: [...new Set(errors)] };
}
