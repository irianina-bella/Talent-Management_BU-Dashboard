// User-configurable analytics rules. Movement hierarchies exist only when configured.
// The 12-Box matrix ships with the organisation's standard 3 x 4 layout (editable in Mapping & Rules).

export type RankDimension = 'talent' | 'calib' | 'talent12Box' | 'talentCluster' | 'talentCategory';

export const RANK_DIMENSIONS: { key: RankDimension; label: string; help: string }[] = [
  { key: 'talent', label: 'Talent flag (Last vs Current year)', help: 'Values of "Talent (Last year)" and "Talent (Current year)".' },
  { key: 'calib', label: 'Talent Calibration flag (Last vs Current year)', help: 'Values of "Talent Calib (Last year)" and "Talent Calib (Current year)".' },
  { key: 'talent12Box', label: 'Talent Class 12 Box', help: 'Used for talent vs performance ordering and matrix legends.' },
  { key: 'talentCluster', label: 'Talent Cluster', help: 'Ordering of clusters in charts.' },
  { key: 'talentCategory', label: 'Talent Category', help: 'Ordering of categories in charts.' },
];

export interface MatrixConfig {
  rows: number;
  cols: number;
  xAxis: string;
  yAxis: string;
  /** Top → bottom */
  rowLabels: string[];
  /** Left → right */
  colLabels: string[];
  /** label → cell; row 0 is the top row, col 0 is the left column */
  cells: Record<string, { r: number; c: number }>;
}

export interface AppConfig {
  /** Highest rank first. Values not listed are "unranked" and excluded from upgrade/downgrade. */
  ranks: Record<RankDimension, string[]>;
  matrix: MatrixConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  ranks: {
    // Binary flag: "Yes" (identified as talent) is ranked above "No". Editable in Settings.
    talent: ['Yes', 'No'],
    calib: ['Yes', 'No'],
    talent12Box: [],
    talentCluster: [],
    talentCategory: [],
  },
  matrix: {
    rows: 3, cols: 4, xAxis: 'Performance', yAxis: 'Potential',
    rowLabels: ['High Potential', 'Medium Potential', 'Low Potential'],
    colLabels: ['Low', 'Medium', 'High', 'Very High'],
    cells: {
      'Diamond in the Rough': { r: 0, c: 0 }, 'Emerging Leaders': { r: 0, c: 1 }, 'Future Leaders': { r: 0, c: 2 }, 'STAR Leaders': { r: 0, c: 3 },
      'Strugglers': { r: 1, c: 0 }, 'Steady Performer': { r: 1, c: 1 }, 'Growing Talent': { r: 1, c: 2 }, 'Experts': { r: 1, c: 3 },
      'Misfits': { r: 2, c: 0 }, 'Average Worker': { r: 2, c: 1 }, 'Solid Contributor': { r: 2, c: 2 }, 'Underutilized / Misplaced': { r: 2, c: 3 },
    },
  },
};

export const DEFAULT_MATRIX: MatrixConfig = DEFAULT_CONFIG.matrix;

const KEY = 'tac.config.v2';

export function loadConfig(): AppConfig {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return DEFAULT_CONFIG;
    const p = JSON.parse(s) as Partial<AppConfig>;
    return {
      ranks: { ...DEFAULT_CONFIG.ranks, ...(p.ranks || {}) },
      matrix: p.matrix && p.matrix.cells && Object.keys(p.matrix.cells).length ? { ...DEFAULT_CONFIG.matrix, ...p.matrix } : DEFAULT_CONFIG.matrix,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(c: AppConfig) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* storage unavailable */ }
}

export type Movement = 'Upgrade' | 'Downgrade' | 'Stable' | 'Unranked' | 'No data';

export function compareRank(order: string[], from: string, to: string): Movement {
  if (!from.trim() || !to.trim()) return 'No data';
  const norm = (s: string) => s.trim().toLowerCase();
  const fi = order.findIndex((o) => norm(o) === norm(from));
  const ti = order.findIndex((o) => norm(o) === norm(to));
  if (norm(from) === norm(to)) return 'Stable';
  if (fi < 0 || ti < 0) return 'Unranked';
  return ti < fi ? 'Upgrade' : 'Downgrade';
}

export function sortByRank(values: string[], order: string[]): string[] {
  const idx = (v: string) => {
    const i = order.findIndex((o) => o.trim().toLowerCase() === v.trim().toLowerCase());
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...values].sort((a, b) => idx(a) - idx(b) || a.localeCompare(b));
}

/** Normalise a talent-class label for tolerant matching: case, spacing, punctuation, "&"/"and", plural "s". */
export function normLabel(s: string): string {
  return s.toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter(Boolean)
    .map((t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t)).join('');
}

/** Find the configured matrix label that an Excel value belongs to (exact-normalised first, then "/"-separated alternatives). */
export function matchMatrixLabel(value: string, mx: MatrixConfig): string | null {
  const v = normLabel(value);
  if (!v) return null;
  const keys = Object.keys(mx.cells);
  const exact = keys.find((k) => normLabel(k) === v);
  if (exact) return exact;
  // Labels like "Underutilized / Misplaced" also accept either part on its own, and vice versa.
  const parts = (s: string) => s.split('/').map(normLabel).filter((x) => x.length >= 5);
  const vp = parts(value);
  return keys.find((k) => { const kp = parts(k); return kp.some((x) => vp.includes(x) || x === v) || vp.includes(normLabel(k)); }) ?? null;
}
