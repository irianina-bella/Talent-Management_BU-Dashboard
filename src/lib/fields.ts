// Canonical field definitions — the internal data mapping layer.
// Original Excel header names are preserved in `header`; duplicated headers
// (Scale / Score) are resolved positionally by the Year anchor that precedes them.

export type FieldType = 'text' | 'number' | 'flag' | 'duration' | 'date';

export interface FieldDef {
  key: FieldKey;
  label: string;
  header: string;
  type: FieldType;
  required?: boolean;
  /** For duplicated headers: the anchor header that the column must follow. */
  anchor?: string;
  group: string;
}

export const FIELD_KEYS = [
  'personnelNumber', 'employeeName', 'companyName', 'personnelArea', 'personnelSubarea', 'positionName',
  'talentLY', 'talentCY', 'calibLY', 'calibCY',
  'businessUnit', 'directorateCode', 'directorateName', 'divisionCode', 'divisionName', 'departmentCode', 'departmentName',
  'yrsInPos', 'yrsInGol', 'avgPat',
  'hiddenGems', 'freeRider', 'lowPerformerCategory', 'lowPerformer', 'successor',
  'reviewerNik', 'reviewerName', 'lastChange',
  'y1Year', 'y1Scale', 'y1Score', 'y2Year', 'y2Scale', 'y2Score', 'y3Year', 'y3Scale', 'y3Score',
  'path', 'education', 'strength', 'weakness', 'tlClassCalibration', 'talent12Box', 'talentCluster', 'talentCategory', 'cLevel',
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELDS: FieldDef[] = [
  { key: 'personnelNumber', label: 'Personnel Number', header: 'Personnel Number', type: 'text', required: true, group: 'Identity' },
  { key: 'employeeName', label: 'Employee Name', header: 'Employee Name', type: 'text', required: true, group: 'Identity' },
  { key: 'companyName', label: 'Company', header: 'Company Name', type: 'text', group: 'Identity' },
  { key: 'personnelArea', label: 'Personnel Area', header: 'Personnel Area Text', type: 'text', group: 'Identity' },
  { key: 'personnelSubarea', label: 'Personnel Subarea', header: 'Pers. subarea text', type: 'text', group: 'Identity' },
  { key: 'positionName', label: 'Position', header: 'Position Name', type: 'text', group: 'Identity' },
  { key: 'talentLY', label: 'Talent (Last Year)', header: 'Talent (Last year)', type: 'text', group: 'Talent' },
  { key: 'talentCY', label: 'Talent (Current Year)', header: 'Talent (Current year)', type: 'text', group: 'Talent' },
  { key: 'calibLY', label: 'Talent Calibration (Last Year)', header: 'Talent Calib (Last year)', type: 'text', group: 'Talent' },
  { key: 'calibCY', label: 'Talent Calibration (Current Year)', header: 'Talent Calib (Current year)', type: 'text', group: 'Talent' },
  { key: 'businessUnit', label: 'Business Unit', header: 'Business Unit Name', type: 'text', group: 'Organization' },
  { key: 'directorateCode', label: 'Directorate Code', header: 'Directorate', type: 'text', group: 'Organization' },
  { key: 'directorateName', label: 'Directorate', header: 'Directorate Name', type: 'text', group: 'Organization' },
  { key: 'divisionCode', label: 'Division Code', header: 'Division', type: 'text', group: 'Organization' },
  { key: 'divisionName', label: 'Division', header: 'Division Name', type: 'text', group: 'Organization' },
  { key: 'departmentCode', label: 'Department Code', header: 'Department', type: 'text', group: 'Organization' },
  { key: 'departmentName', label: 'Department', header: 'Department Name', type: 'text', group: 'Organization' },
  { key: 'yrsInPos', label: 'Years in Current Position', header: 'Yrs in Current Pos', type: 'duration', group: 'Tenure' },
  { key: 'yrsInGol', label: 'Years in Current Grade', header: 'Yrs in Current Gol', type: 'duration', group: 'Tenure' },
  { key: 'avgPat', label: 'Average PAT', header: 'Average PAT', type: 'number', group: 'Performance' },
  { key: 'hiddenGems', label: 'Hidden Gems', header: 'Hidden Gems', type: 'flag', group: 'Flags' },
  { key: 'freeRider', label: 'Free Rider', header: 'Free Rider', type: 'flag', group: 'Flags' },
  { key: 'lowPerformerCategory', label: 'Low Performer Category', header: 'Low Performer Category', type: 'text', group: 'Flags' },
  { key: 'lowPerformer', label: 'Low Performer', header: 'Low Performer', type: 'flag', group: 'Flags' },
  { key: 'successor', label: 'Identified as Successor', header: 'Identified as Successor', type: 'text', group: 'Succession' },
  { key: 'reviewerNik', label: 'Reviewer NIK', header: 'Reviewer NIK', type: 'text', group: 'Review' },
  { key: 'reviewerName', label: 'Reviewer Name', header: 'Reviewer Name', type: 'text', group: 'Review' },
  { key: 'lastChange', label: 'Last Change', header: 'Last Change', type: 'date', group: 'Review' },
  { key: 'y1Year', label: 'Year -1', header: 'Year -1', type: 'text', group: 'Performance' },
  { key: 'y1Scale', label: 'Year -1 Scale', header: 'Scale', anchor: 'Year -1', type: 'text', group: 'Performance' },
  { key: 'y1Score', label: 'Year -1 Score', header: 'Score', anchor: 'Year -1', type: 'number', group: 'Performance' },
  { key: 'y2Year', label: 'Year -2', header: 'Year -2', type: 'text', group: 'Performance' },
  { key: 'y2Scale', label: 'Year -2 Scale', header: 'Scale', anchor: 'Year -2', type: 'text', group: 'Performance' },
  { key: 'y2Score', label: 'Year -2 Score', header: 'Score', anchor: 'Year -2', type: 'number', group: 'Performance' },
  { key: 'y3Year', label: 'Year -3', header: 'Year -3', type: 'text', group: 'Performance' },
  { key: 'y3Scale', label: 'Year -3 Scale', header: 'Scale', anchor: 'Year -3', type: 'text', group: 'Performance' },
  { key: 'y3Score', label: 'Year -3 Score', header: 'Score', anchor: 'Year -3', type: 'number', group: 'Performance' },
  { key: 'path', label: 'Path', header: 'Path', type: 'text', group: 'Profile' },
  { key: 'education', label: 'Education', header: 'Education Scale', type: 'text', group: 'Profile' },
  { key: 'strength', label: 'Strength', header: 'Strength', type: 'text', group: 'Profile' },
  { key: 'weakness', label: 'Weakness', header: 'Weakness', type: 'text', group: 'Profile' },
  { key: 'tlClassCalibration', label: 'TL Class Calibration', header: 'TL Class Calibration', type: 'text', group: 'Talent' },
  { key: 'talent12Box', label: 'Talent Class 12 Box', header: 'Talent Class 12 Box Text', type: 'text', group: 'Talent' },
  { key: 'talentCluster', label: 'Talent Cluster', header: 'Talent Cluster Text', type: 'text', group: 'Talent' },
  { key: 'talentCategory', label: 'Talent Category', header: 'Talent Category', type: 'text', group: 'Talent' },
  { key: 'cLevel', label: 'C-Level', header: 'C-Level', type: 'text', group: 'Organization' },
];

export const FIELD_BY_KEY: Record<FieldKey, FieldDef> = Object.fromEntries(FIELDS.map((f) => [f.key, f])) as Record<FieldKey, FieldDef>;

export type ColumnMapping = Record<FieldKey, number | null>;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 \-().]/g, '').trim();

/** Build display labels for headers, disambiguating duplicates: "Scale (#2, col AG)". */
export function headerLabels(headers: string[]): string[] {
  const seen: Record<string, number> = {};
  const totals: Record<string, number> = {};
  headers.forEach((h) => (totals[norm(h)] = (totals[norm(h)] || 0) + 1));
  return headers.map((h, i) => {
    const k = norm(h);
    seen[k] = (seen[k] || 0) + 1;
    const col = columnLetter(i);
    const name = h.trim() || '(blank header)';
    return totals[k] > 1 ? `${name} (#${seen[k]}, col ${col})` : `${name} (col ${col})`;
  });
}

export function columnLetter(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Automatically map Excel columns to canonical fields. */
export function autoMap(headers: string[]): ColumnMapping {
  const nh = headers.map(norm);
  const mapping = {} as ColumnMapping;
  const used = new Set<number>();
  const yearAnchors = nh.map((h, i) => (/^year -?\d+$/.test(h) ? i : -1)).filter((i) => i >= 0);

  for (const f of FIELDS) {
    const target = norm(f.header);
    let idx = -1;
    if (f.anchor) {
      const a = nh.indexOf(norm(f.anchor));
      if (a >= 0) {
        const next = yearAnchors.find((y) => y > a) ?? nh.length;
        for (let i = a + 1; i < next; i++) if (nh[i] === target && !used.has(i)) { idx = i; break; }
      }
    } else {
      idx = nh.findIndex((h, i) => h === target && !used.has(i));
    }
    mapping[f.key] = idx >= 0 ? idx : null;
    if (idx >= 0) used.add(idx);
  }
  return mapping;
}

export function detectHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    if (rows[i].some((c) => norm(String(c)) === 'personnel number')) return i;
  }
  return 0;
}
