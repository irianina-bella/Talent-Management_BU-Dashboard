// User-configurable analytics rules. Nothing here is assumed from the data:
// movement hierarchies and matrix positions only exist when configured.

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
  matrix: { rows: 3, cols: 4, xAxis: 'Performance', yAxis: 'Potential', cells: {} },
};

const KEY = 'tic.config.v1';

export function loadConfig(): AppConfig {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return DEFAULT_CONFIG;
    const p = JSON.parse(s) as Partial<AppConfig>;
    return {
      ranks: { ...DEFAULT_CONFIG.ranks, ...(p.ranks || {}) },
      matrix: { ...DEFAULT_CONFIG.matrix, ...(p.matrix || {}) },
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
