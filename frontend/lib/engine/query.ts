// Deterministic query understanding: follow-ups, intent, expansions and synonyms.
// A port of backend/app/agent/query.py, plus a few vocabulary entries the browser engine needs
// because it has no cross-encoder to bridge paraphrases.

import { tokenize } from "./text";

export type Intent =
  | "termination" | "payment" | "duration" | "confidentiality" | "liability"
  | "dispute" | "rights" | "obligations" | "definition" | "summary" | "general";

const INTENT_KEYWORDS: [Intent, string[]][] = [
  ["termination", ["terminat", "cancel", "end the", "notice period", "exit", "quit", "resign", "walk away", "leave"]],
  ["payment", ["pay", "fee", "invoice", "price", "cost", "salary", "compensat", "interest", "late", "money", "rent", "deposit"]],
  ["duration", ["term", "how long", "duration", "renew", "expire", "start", "begin", "effective"]],
  ["confidentiality", ["confidential", "secret", "disclos", "nda", "privacy"]],
  ["liability", ["liab", "damages", "indemn", "cap", "loss", "responsible", "warrant"]],
  ["dispute", ["dispute", "court", "governing law", "jurisdiction", "arbitrat", "sue", "lawsuit"]],
  ["rights", ["own", "intellectual property", "ip", "rights", "licen", "assign"]],
  ["obligations", ["must", "shall", "obligat", "required", "responsib", "deliver", "duties"]],
  ["definition", ["what does", "define", "definition", "meaning", "means"]],
  ["summary", ["summar", "overview", "key points", "main points", "what is this agreement"]],
];

export const INTENT_EXPANSIONS: Record<Intent, string> = {
  termination: "termination terminate notice period written notice end agreement",
  payment: "fees payment invoice payable amount interest late payment",
  duration: "term initial term renewal renews expiry effective date",
  confidentiality: "confidential information confidentiality obligations disclosure survive",
  liability: "limitation of liability liable damages indemnity cap total liability",
  dispute: "governing law disputes jurisdiction courts arbitration",
  rights: "intellectual property ownership rights assignment licence",
  obligations: "shall obligations perform services deliver",
  definition: "means definitions defined terms",
  summary: "agreement parties services term fees termination",
  general: "",
};

/** How people ask → how agreements are written. */
export const SYNONYMS: Record<string, string[]> = {
  quit: ["terminate", "resign", "notice"],
  leave: ["terminate", "resignation", "notice"],
  fire: ["terminate", "dismissal", "cause"],
  cancel: ["terminate", "termination"],
  end: ["terminate", "termination", "expiry"],
  early: ["terminate", "convenience"],
  pay: ["fees", "payment", "invoice"],
  salary: ["compensation", "remuneration", "fees"],
  late: ["overdue", "interest"],
  sue: ["dispute", "courts", "jurisdiction"],
  secret: ["confidential", "confidentiality"],
  own: ["intellectual", "property", "rights", "assigned"],
  owns: ["intellectual", "property", "rights", "assigned"],
  cap: ["limitation", "limited", "total", "liability"],
  renew: ["renewal", "renews", "term"],
  long: ["term", "duration", "period"],
  contract: ["agreement"],
  due: ["payable", "within"],
  breach: ["breach", "remedy", "cause"],
  breaches: ["breach", "remedy", "cause"],
  law: ["governed", "governing", "laws"],
  // Agreements state periods as durations ("30 days"), not with the word "period".
  period: ["days", "months", "years"],
  send: ["deliver", "provide"],
  give: ["provide", "deliver", "grant"],
  transfer: ["assign", "assignment"],
};

const FOLLOW_UP =
  /^(and|but|also|what about|how about|what if|is that|does that|can they|can it|why|so)\b|\b(it|that|this|they|them|those|he|she|the other|same|instead)\b/i;

export function isFollowUp(question: string, hasHistory: boolean): boolean {
  if (!hasHistory) return false;
  return FOLLOW_UP.test(question) || tokenize(question).length <= 1;
}

export function resolveQuestion(question: string, history: string[]): string {
  const q = question.trim();
  if (!isFollowUp(q, history.length > 0)) return q;
  return `${q} (follow-up to: ${history.at(-1)})`;
}

export function classifyIntent(question: string): Intent {
  const lowered = question.toLowerCase();
  for (const [intent, keywords] of INTENT_KEYWORDS) {
    if (keywords.some((k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(lowered))) return intent;
  }
  return "general";
}

export function synonymTerms(question: string): string[] {
  const words = question.toLowerCase().match(/[a-z]+/g) ?? [];
  return [...new Set(words.flatMap((w) => SYNONYMS[w] ?? []))];
}
