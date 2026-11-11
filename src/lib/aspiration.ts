// Career aspiration text analysis. Original Excel text is always preserved;
// categories come only from the user-configurable keyword rules (no inferred equivalences).
import { Employee } from './model';
import { AspirationCategory, UNCLASSIFIED } from './config';
import { APPROVED_CATEGORIES, matchApprovedCategory } from '../analytics/aspirationCategoryMapping';

export type Horizon = 'short' | 'long';
export const HORIZON_FIELD = { short: 'shortTermAspiration', long: 'longTermAspiration' } as const;
export const HORIZON_LABEL = { short: 'Short-Term', long: 'Long-Term' } as const;

export interface AspEntry {
  original: string;   // one entry exactly as written (trimmed)
  normalized: string; // for grouping identical texts: lowercase, collapsed whitespace/punctuation
  category: string;   // first matching category in configured order
  fn: string;         // first matching FUNCTION category (or Unclassified)
}

const SPLIT = /\r?\n|;|\||,|•|·|\s+\/\/\s+/;
const BULLET = /^\s*(?:\d+[.)]|[-*•–])\s*/;

export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[–—]/g, '-').replace(/[^a-z0-9&+#\- ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cache = new WeakMap<AspirationCategory[], { name: string; kind: string; re: RegExp | null }[]>();
function compiled(cats: AspirationCategory[]) {
  let c = cache.get(cats);
  if (!c) {
    c = cats.map((k) => {
      const words = k.keywords.map((w) => normalizeText(w)).filter(Boolean);
      return { name: k.name, kind: k.kind, re: words.length ? new RegExp(`(^|[^a-z0-9])(${words.map(esc).join('|')})(?=[^a-z0-9]|$)`) : null };
    });
    cache.set(cats, c);
  }
  return c;
}

/** Display order: the 10 approved aspiration categories first, then keyword categories, then Unclassified. */
export const categoryOrder = (cats: AspirationCategory[]) => [...APPROVED_CATEGORIES.map((c) => c.name), ...cats.map((c) => c.name), UNCLASSIFIED];

export function categorize(text: string, cats: AspirationCategory[]): { category: string; fn: string } {
  // Values that exactly match an approved aspiration category (the CONV- columns) keep that category.
  const approved = matchApprovedCategory(text);
  if (approved) return { category: approved.name, fn: approved.name };
  const t = normalizeText(text);
  const c = compiled(cats);
  const hit = c.find((k) => k.re && k.re.test(t));
  const fn = c.find((k) => k.kind === 'function' && k.re && k.re.test(t));
  return { category: hit?.name ?? UNCLASSIFIED, fn: fn?.name ?? UNCLASSIFIED };
}

/** Split a cell into separate aspiration entries (multiple positions / interests per cell). */
export function parseEntries(cell: string, cats: AspirationCategory[]): AspEntry[] {
  if (!cell.trim()) return [];
  const parts = cell.split(SPLIT).map((p) => p.replace(BULLET, '').trim()).filter((p) => p && normalizeText(p));
  const seen = new Set<string>();
  const out: AspEntry[] = [];
  for (const p of parts) {
    const n = normalizeText(p);
    if (seen.has(n)) continue;
    seen.add(n);
    out.push({ original: p, normalized: n, ...categorize(p, cats) });
  }
  return out;
}

export interface EmpAsp {
  e: Employee;
  short: AspEntry[];
  long: AspEntry[];
  /** Primary pattern (first of `patterns`), null when the employee lacks either aspiration. */
  pattern: Pattern | null;
  /** All observed patterns — an employee can show more than one (e.g. leadership step + function change). */
  patterns: Pattern[];
  similarity: number | null; // 0..1 token overlap between ST and LT text
}

export type Pattern = 'Consistent Career Direction' | 'Leadership Aspiration' | 'Functional Mobility Interest' | 'Career Transition' | 'Different Short-Term and Long-Term Interests';
export const PATTERNS: Pattern[] = ['Consistent Career Direction', 'Leadership Aspiration', 'Functional Mobility Interest', 'Career Transition', 'Different Short-Term and Long-Term Interests'];
export const PATTERN_HELP: Record<Pattern, string> = {
  'Consistent Career Direction': 'Short- and long-term entries share a category, or the text is the same (exclusive of the others).',
  'Leadership Aspiration': 'Long-term entries reach a leadership-level category that the short-term entries do not.',
  'Functional Mobility Interest': 'Short- and long-term entries point to different functional areas.',
  'Career Transition': "Short-term function differs from the function of the employee's current position.",
  'Different Short-Term and Long-Term Interests': 'Entries differ but none of the patterns above applies (e.g. unclassified text).',
};

const tokens = (s: string) => new Set(normalizeText(s).split(' ').filter((t) => t.length > 1 && !['of', 'and', 'the', 'di', 'dan', 'to'].includes(t)));
export function similarity(a: string, b: string): number | null {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return null;
  let inter = 0;
  A.forEach((t) => { if (B.has(t)) inter++; });
  return inter / (A.size + B.size - inter);
}

export function analyse(list: Employee[], cats: AspirationCategory[]): EmpAsp[] {
  const levelNames = new Set(cats.filter((c) => c.kind === 'level').map((c) => c.name));
  return list.map((e) => {
    const short = parseEntries(e.v.shortTermAspiration, cats);
    const long = parseEntries(e.v.longTermAspiration, cats);
    const patterns: Pattern[] = [];
    let sim: number | null = null;
    if (short.length && long.length) {
      sim = similarity(e.v.shortTermAspiration, e.v.longTermAspiration);
      const sc = new Set(short.map((x) => x.category).filter((c) => c !== UNCLASSIFIED));
      const lc = new Set(long.map((x) => x.category).filter((c) => c !== UNCLASSIFIED));
      const sf = new Set(short.map((x) => x.fn).filter((c) => c !== UNCLASSIFIED));
      const lf = new Set(long.map((x) => x.fn).filter((c) => c !== UNCLASSIFIED));
      const sameText = short.some((s) => long.some((l) => l.normalized === s.normalized));
      const shareCat = [...sc].some((c) => lc.has(c));
      const ltLeader = [...lc].some((c) => levelNames.has(c)) && ![...sc].some((c) => levelNames.has(c));
      const currentFn = e.v.positionName ? categorize(e.v.positionName, cats).fn : UNCLASSIFIED;
      if (sameText || shareCat) patterns.push('Consistent Career Direction');
      else {
        if (ltLeader) patterns.push('Leadership Aspiration');
        if (sf.size && lf.size && ![...sf].some((f) => lf.has(f))) patterns.push('Functional Mobility Interest');
        if (currentFn !== UNCLASSIFIED && sf.size && !sf.has(currentFn)) patterns.push('Career Transition');
        if (!patterns.length) patterns.push('Different Short-Term and Long-Term Interests');
      }
    }
    return { e, short, long, pattern: patterns[0] ?? null, patterns, similarity: sim };
  });
}

export const coverageOf = (a: EmpAsp) => (a.short.length && a.long.length ? 'Both short- and long-term' : a.short.length ? 'Short-term only' : a.long.length ? 'Long-term only' : 'No aspiration data');
export const COVERAGE = ['Both short- and long-term', 'Short-term only', 'Long-term only', 'No aspiration data'];
export const simBucket = (s: number | null) => (s === null ? 'Not comparable' : s >= 0.6 ? 'High overlap (≥ 60%)' : s >= 0.2 ? 'Partial overlap (20–59%)' : 'Low overlap (< 20%)');

/** Employees per category (an employee with several entries counts once in each of their categories). */
export function categoryCounts(rows: EmpAsp[], h: Horizon, key: 'category' | 'fn' = 'category') {
  const m = new Map<string, EmpAsp[]>();
  for (const r of rows) {
    const ents = h === 'short' ? r.short : r.long;
    for (const c of new Set(ents.map((x) => x[key]))) {
      if (!m.has(c)) m.set(c, []);
      m.get(c)!.push(r);
    }
  }
  return m;
}

/** Most frequent aspiration texts (grouped by normalized text, labelled with the most common original spelling). */
export function topTexts(rows: EmpAsp[], h: Horizon) {
  const m = new Map<string, { label: Map<string, number>; rows: EmpAsp[]; category: string }>();
  for (const r of rows) for (const x of h === 'short' ? r.short : r.long) {
    if (!m.has(x.normalized)) m.set(x.normalized, { label: new Map(), rows: [], category: x.category });
    const g = m.get(x.normalized)!;
    g.label.set(x.original, (g.label.get(x.original) || 0) + 1);
    if (!g.rows.includes(r)) g.rows.push(r);
  }
  return [...m.entries()].map(([norm, g]) => ({ norm, name: [...g.label.entries()].sort((a, b) => b[1] - a[1])[0][0], rows: g.rows, category: g.category }))
    .sort((a, b) => b.rows.length - a.rows.length);
}
