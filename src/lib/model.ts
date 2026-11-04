import { FIELDS, FIELD_KEYS, FieldKey, ColumnMapping, FIELD_BY_KEY } from './fields';

export interface RawDataset {
  fileName: string;
  sheetName: string;
  headerRow: number; // 0-based index of header row in the sheet
  importedAt: string;
  headers: string[];
  rows: string[][];
}

export interface Employee {
  id: string; // personnel number
  row: number; // 1-based Excel row number
  v: Record<FieldKey, string>;
  n: {
    avgPat: number | null;
    y1Score: number | null;
    y2Score: number | null;
    y3Score: number | null;
    yrsInPos: number | null;
    yrsInGol: number | null;
  };
}

export type IssueSeverity = 'error' | 'warning';
export interface Issue {
  row: number;
  personnelNumber: string;
  field: string;
  severity: IssueSeverity;
  message: string;
  value: string;
}

export interface ImportResult {
  employees: Employee[];
  issues: Issue[];
  totalRows: number;
  successRows: number;
  failedRows: number;
  skippedEmptyRows: number;
  duplicateIds: string[];
  missingByField: Record<FieldKey, number>;
  missingRequiredColumns: string[];
  unmappedFields: FieldKey[];
}

export const NA = 'N/A';

export function display(v: string | null | undefined): string {
  if (v === null || v === undefined) return NA;
  const t = String(v).trim();
  return t === '' ? NA : t;
}

export function isYes(v: string): boolean {
  return /^(yes|y|true|ya)$/i.test(v.trim());
}

/** Successor only when the Excel explicitly carries a non-negative value. */
export function isSuccessor(v: string): boolean {
  const t = v.trim();
  if (!t) return false;
  return !/^(no|n|false|0|-|n\/a|na|none|tidak|0 positions?)$/i.test(t);
}

export function parseNumber(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t.replace(/,/g, '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

/** Parses "02 YEARS 06 MONTH" → 2.5. Plain numbers are taken as years. */
export function parseDuration(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const m = t.match(/(\d+)\s*years?\s*(\d+)\s*months?/i);
  if (m) return Number(m[1]) + Number(m[2]) / 12;
  const y = t.match(/^(\d+)\s*years?$/i);
  if (y) return Number(y[1]);
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

const finite = (n: number | null) => (n === null || Number.isNaN(n) ? null : n);

export function buildEmployees(raw: RawDataset, mapping: ColumnMapping): ImportResult {
  const issues: Issue[] = [];
  const missingByField = Object.fromEntries(FIELD_KEYS.map((k) => [k, 0])) as Record<FieldKey, number>;
  const missingRequiredColumns = FIELDS.filter((f) => f.required && mapping[f.key] === null).map((f) => f.header);
  const unmappedFields = FIELDS.filter((f) => mapping[f.key] === null).map((f) => f.key);
  const employees: Employee[] = [];
  const seen = new Map<string, number>();
  const duplicateIds = new Set<string>();
  let skipped = 0;
  let failed = 0;

  if (missingRequiredColumns.length) {
    return {
      employees: [], issues: [], totalRows: raw.rows.length, successRows: 0, failedRows: raw.rows.length,
      skippedEmptyRows: 0, duplicateIds: [], missingByField, missingRequiredColumns, unmappedFields,
    };
  }

  raw.rows.forEach((r, i) => {
    const excelRow = raw.headerRow + i + 2;
    if (r.every((c) => String(c ?? '').trim() === '')) { skipped++; return; }
    const v = {} as Record<FieldKey, string>;
    for (const k of FIELD_KEYS) {
      const idx = mapping[k];
      v[k] = idx === null || idx === undefined ? '' : String(r[idx] ?? '').trim();
      if (idx !== null && v[k] === '') missingByField[k]++;
    }
    const pn = v.personnelNumber;
    const push = (field: FieldKey, severity: IssueSeverity, message: string) =>
      issues.push({ row: excelRow, personnelNumber: pn, field: FIELD_BY_KEY[field].header, severity, message, value: v[field] });

    if (!pn) { push('personnelNumber', 'error', 'Missing Personnel Number — record not imported'); failed++; return; }
    if (seen.has(pn)) {
      duplicateIds.add(pn);
      push('personnelNumber', 'error', `Duplicate Personnel Number (first seen at row ${seen.get(pn)}) — record not imported`);
      failed++;
      return;
    }
    seen.set(pn, excelRow);
    if (!v.employeeName) push('employeeName', 'warning', 'Missing Employee Name');

    const num = (k: FieldKey) => {
      const n = parseNumber(v[k]);
      if (Number.isNaN(n)) push(k, 'warning', 'Invalid number — treated as N/A');
      return finite(n);
    };
    const dur = (k: FieldKey) => {
      const n = parseDuration(v[k]);
      if (Number.isNaN(n)) push(k, 'warning', 'Unrecognised duration format — treated as N/A');
      return finite(n);
    };
    for (const k of ['talentLY', 'talentCY', 'calibLY', 'calibCY', 'hiddenGems', 'freeRider', 'lowPerformer'] as FieldKey[]) {
      if (v[k] && !/^(yes|no|y|n|true|false|ya|tidak)$/i.test(v[k])) push(k, 'warning', 'Unexpected flag value (expected Yes/No) — kept as-is');
    }

    employees.push({
      id: pn,
      row: excelRow,
      v,
      n: {
        avgPat: num('avgPat'), y1Score: num('y1Score'), y2Score: num('y2Score'), y3Score: num('y3Score'),
        yrsInPos: dur('yrsInPos'), yrsInGol: dur('yrsInGol'),
      },
    });
  });

  return {
    employees, issues, totalRows: raw.rows.length - skipped, successRows: employees.length, failedRows: failed,
    skippedEmptyRows: skipped, duplicateIds: [...duplicateIds], missingByField, missingRequiredColumns, unmappedFields,
  };
}

export function issuesToCsv(issues: Issue[]): string {
  const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const head = ['Excel Row', 'Personnel Number', 'Column', 'Severity', 'Issue', 'Value'];
  return [head.map(esc).join(','), ...issues.map((i) => [i.row, i.personnelNumber, i.field, i.severity, i.message, i.value].map(esc).join(','))].join('\r\n');
}

export function downloadText(name: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
