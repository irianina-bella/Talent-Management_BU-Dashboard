import { Employee, isYes, isSuccessor, NA } from './model';
import { FieldKey } from './fields';

export const pct = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100);
export const fmtPct = (n: number, d: number) => (d === 0 ? NA : `${pct(n, d).toFixed(1)}%`);
export const fmtNum = (n: number | null | undefined, digits = 2) => (n === null || n === undefined || Number.isNaN(n) ? NA : n.toFixed(digits));

export const val = (e: Employee, k: FieldKey) => (e.v[k] && e.v[k].trim() !== '' ? e.v[k] : NA);

export type YearView = 'current' | 'last';
export const talentFlag = (e: Employee, y: YearView) => (y === 'current' ? e.v.talentCY : e.v.talentLY);
export const calibFlag = (e: Employee, y: YearView) => (y === 'current' ? e.v.calibCY : e.v.calibLY);
export const isTalent = (e: Employee, y: YearView) => isYes(talentFlag(e, y));
export const isCalibTalent = (e: Employee, y: YearView) => isYes(calibFlag(e, y));
export { isYes, isSuccessor };

export interface CountRow { name: string; value: number; }

export function countBy(list: Employee[], key: (e: Employee) => string): CountRow[] {
  const m = new Map<string, number>();
  for (const e of list) {
    const k = key(e) || NA;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function groupBy(list: Employee[], key: (e: Employee) => string): Map<string, Employee[]> {
  const m = new Map<string, Employee[]>();
  for (const e of list) {
    const k = key(e) || NA;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(e);
  }
  return m;
}

export function uniqueValues(list: Employee[], k: FieldKey): string[] {
  const s = new Set<string>();
  for (const e of list) s.add(val(e, k));
  return [...s].sort((a, b) => (a === NA ? 1 : b === NA ? -1 : a.localeCompare(b)));
}

/** Cross-tab: rows × cols counts with members. */
export interface CrossTab {
  rows: string[];
  cols: string[];
  cells: Record<string, Record<string, Employee[]>>;
}

export function crossTab(list: Employee[], rowKey: (e: Employee) => string, colKey: (e: Employee) => string, rowOrder?: string[], colOrder?: string[]): CrossTab {
  const cells: CrossTab['cells'] = {};
  const rs = new Set<string>();
  const cs = new Set<string>();
  for (const e of list) {
    const r = rowKey(e) || NA;
    const c = colKey(e) || NA;
    rs.add(r); cs.add(c);
    cells[r] ??= {};
    (cells[r][c] ??= []).push(e);
  }
  const order = (set: Set<string>, pref?: string[]) => {
    const arr = [...set];
    const idx = (v: string) => {
      const i = (pref || []).findIndex((p) => p.toLowerCase() === v.toLowerCase());
      return i < 0 ? 9999 : i;
    };
    return arr.sort((a, b) => idx(a) - idx(b) || (a === NA ? 1 : b === NA ? -1 : a.localeCompare(b)));
  };
  return { rows: order(rs, rowOrder), cols: order(cs, colOrder), cells };
}

export function mean(nums: (number | null)[]): number | null {
  const v = nums.filter((n): n is number => n !== null && !Number.isNaN(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export type PerfTrend = 'Improving' | 'Declining' | 'Consistent' | 'Fluctuating' | 'Insufficient data';

/** Ordered oldest → newest using Year -3, -2, -1 scores. */
export function perfTrend(e: Employee): PerfTrend {
  const s = [e.n.y3Score, e.n.y2Score, e.n.y1Score].filter((n): n is number => n !== null);
  if (s.length < 2) return 'Insufficient data';
  const diffs = s.slice(1).map((v, i) => v - s[i]);
  if (diffs.every((d) => d === 0)) return 'Consistent';
  if (diffs.every((d) => d >= 0)) return 'Improving';
  if (diffs.every((d) => d <= 0)) return 'Declining';
  return 'Fluctuating';
}

export function orgName(e: Employee, dim: OrgDim): string {
  return val(e, ORG_DIMS.find((d) => d.key === dim)!.field);
}

export type OrgDim = 'company' | 'bu' | 'directorate' | 'division' | 'department' | 'clevel' | 'personnelArea';
export const ORG_DIMS: { key: OrgDim; label: string; field: FieldKey }[] = [
  { key: 'company', label: 'Company', field: 'companyName' },
  { key: 'bu', label: 'Business Unit', field: 'businessUnit' },
  { key: 'directorate', label: 'Directorate', field: 'directorateName' },
  { key: 'division', label: 'Division', field: 'divisionName' },
  { key: 'department', label: 'Department', field: 'departmentName' },
  { key: 'clevel', label: 'C-Level', field: 'cLevel' },
  { key: 'personnelArea', label: 'Personnel Area', field: 'personnelArea' },
];
