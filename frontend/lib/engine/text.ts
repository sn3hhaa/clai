// Text utilities shared by the browser engine. Mirrors backend/app/retrieval/lexical.py so
// both engines tokenise agreements the same way.

export const STOPWORDS = new Set(
  `a an and are as at be by can could do does for from had has have how i if in into is it its me my of on or our
  shall should so than that the their them then there these they this those to under upon was we were what when
  where which who whom why will with would you your about any agreement party parties
  much many long get say says said clause section mean means tell please there's whats
  someone somebody anyone anybody something anything else often must need needs needed happen happens
  thing things way does doing done going let lets i'm we're it's`
    .split(/\s+/)
    .filter(Boolean),
);

// Longest first. Light stemming so terminate/termination/terminated and pay/payment/payable meet.
const SUFFIXES = ["ations", "ation", "ating", "ated", "ates", "ings", "ment", "ments", "able", "ing", "ate", "ed", "es", "ly", "s", "e"];
const TOKEN = /[a-z0-9]+(?:[.,][0-9]+)*/g;

export function stem(word: string): string {
  if (/^\d+$/.test(word) || word.length <= 3) return word;
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) return word.slice(0, -suffix.length);
  }
  return word;
}

export function normalise(text: string): string {
  return text
    .replace(/ /g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(TOKEN) ?? []).filter((t) => !STOPWORDS.has(t)).map(stem);
}

/** Sentence spans: terminal punctuation (optionally closed by a quote/bracket) followed by whitespace. */
export function sentences(text: string): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = [];
  const boundary = /(?<=[.!?;]["')\]]?)\s+/g;
  let start = 0;
  for (const match of text.matchAll(boundary)) {
    const piece = text.slice(start, match.index);
    if (piece.trim()) out.push({ start, text: piece });
    start = (match.index ?? 0) + match[0].length;
  }
  if (text.slice(start).trim()) out.push({ start, text: text.slice(start) });
  return out;
}

export function splitAnswerSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z"'(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}
