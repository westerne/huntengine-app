// What the advisor knows about a hunter (docs/SPEC_ADVISOR.md §7): short facts
// they said Yes to saving ("one week off, in October"), kept on
// profiles.planning.facts and shown on Me, where they can edit or delete them.
// Pure: the routes load and save the profile; these only change the list.

export type Fact = { id: string; text: string; savedOn: string };

export const MAX_FACTS = 30;
export const MAX_FACT_CHARS = 200;

export function cleanFactText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_FACT_CHARS);
  return t.length >= 3 ? t : null;
}

export function factsOf(planning: unknown): Fact[] {
  const list = (planning as { facts?: unknown } | null)?.facts;
  return Array.isArray(list)
    ? list.filter((f): f is Fact => !!f && typeof f.id === 'string' && typeof f.text === 'string').slice(0, MAX_FACTS)
    : [];
}

// Newest first; the same fact twice is saved once.
export function addFact(facts: Fact[], text: string, id: string, today: string): Fact[] {
  const same = (f: Fact) => f.text.toLowerCase() === text.toLowerCase();
  if (facts.some(same)) return facts;
  return [{ id, text, savedOn: today }, ...facts].slice(0, MAX_FACTS);
}
export const editFact = (facts: Fact[], id: string, text: string) => facts.map((f) => (f.id === id ? { ...f, text } : f));
export const removeFact = (facts: Fact[], id: string) => facts.filter((f) => f.id !== id);

// A conversation's name: the first question, cut at a word.
export function threadTitle(question: string): string {
  const q = question.replace(/\s+/g, ' ').trim();
  if (q.length <= 60) return q;
  return `${q.slice(0, 60).replace(/\s+\S*$/, '')}…`;
}
