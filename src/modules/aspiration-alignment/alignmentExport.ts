// Aspiration alignment exports. Employee-level files are produced only on explicit user confirmation.
import type { AlignmentRow } from '../../analytics/aspirationAlignment';
import { summarize, ALIGNMENT_CLASSES } from '../../analytics/aspirationAlignment';
import { APPROVED_CATEGORIES } from '../../analytics/aspirationCategoryMapping';
import type { Employee } from '../../lib/model';
import { ORG_DIMS, orgName } from '../../lib/analytics';

type Row = (string | number | null)[];
const NA = 'N/A';
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : NA);

export function employeeRows(rows: AlignmentRow<Employee>[]): Row[] {
  return [
    ['Personnel Number', 'Employee Name', 'Company', 'Business Unit', 'Directorate', 'Division', 'Department', 'Position Name',
      'Short-Term Aspiration', 'Short-Term Classification', 'Short-Term Point', 'Long-Term Aspiration', 'Long-Term Classification', 'Long-Term Point',
      'Short-Term Weighted Contribution', 'Long-Term Weighted Contribution', 'Raw Aspiration Alignment Score', 'Display Aspiration Alignment Score',
      'Alignment Classification', 'Data Validation Status'],
    ...rows.map(({ e, a }) => {
      const v = e.v, r = a.result, st = a.shortTerm, lt = a.longTerm;
      return [v.personnelNumber, v.employeeName || NA, v.companyName || NA, v.businessUnit || NA, v.directorateName || NA, v.divisionName || NA, v.departmentName || NA, v.positionName || NA,
        st.original || NA, st.category?.classification ?? NA, st.category?.point ?? NA, lt.original || NA, lt.category?.classification ?? NA, lt.category?.point ?? NA,
        r ? r.shortTermWeightedPoint : NA, r ? r.longTermWeightedPoint : NA, r ? r.rawAlignmentScore : NA, r ? r.displayAlignmentScore : NA,
        a.status, a.validation];
    }),
  ];
}

export function summaryRows(rows: AlignmentRow<Employee>[], filterText: string): Row[] {
  const s = summarize(rows);
  const out: Row[] = [
    ['Employee Aspiration Alignment — Summary'], ['Model', 'Score = ((ST × 70%) + (LT × 30%)) / 3 × 100%'], ['Thresholds', 'HIGH ≥ 80% · MEDIUM ≥ 55% and < 80% · LOW < 55% (unrounded)'],
    ['Filters', filterText || 'None'], ['Generated', new Date().toLocaleString()], [],
    ['DATA COVERAGE (denominator: total population)', 'Employees', '% of total population'],
    ['Total population', s.total, s.total ? 100 : NA], ['Scored population (complete & mapped)', s.scored, pct(s.scored, s.total)],
    ['Incomplete data', s.incomplete, pct(s.incomplete, s.total)], ['Unmapped category', s.unmapped, pct(s.unmapped, s.total)], ['No aspiration data', s.noData, pct(s.noData, s.total)], [],
    ['ALIGNMENT (denominator: scored population)', 'Employees', '% of scored population'],
    ...ALIGNMENT_CLASSES.map((c) => [c, s.byClass[c], pct(s.byClass[c], s.scored)]),
    ['Average alignment score', s.averageScore === null ? NA : Math.round(s.averageScore * 10) / 10], [],
  ];
  for (const side of ['shortTerm', 'longTerm'] as const) {
    out.push([`${side === 'shortTerm' ? 'SHORT' : 'LONG'}-TERM CATEGORY (denominator: total population)`, 'Classification', 'Point', 'Employees', '% of total population']);
    for (const c of APPROVED_CATEGORIES) { const n = rows.filter((r) => r.a[side].category?.no === c.no).length; out.push([c.name, c.classification, c.point, n, pct(n, s.total)]); }
    const um = rows.filter((r) => r.a[side].status === 'unmapped').length, ms = rows.filter((r) => r.a[side].status === 'missing').length;
    out.push(['Unmapped', NA, NA, um, pct(um, s.total)], ['Missing', NA, NA, ms, pct(ms, s.total)], []);
  }
  for (const d of ORG_DIMS.filter((x) => ['company', 'bu', 'directorate', 'division', 'department'].includes(x.key))) {
    out.push([`BY ${d.label.toUpperCase()}`, 'Total', 'Scored', 'HIGH', 'MEDIUM', 'LOW', '% HIGH (of scored)', 'Average score', 'Incomplete', 'Unmapped', 'No data']);
    const g = new Map<string, AlignmentRow<Employee>[]>();
    for (const r of rows) { const k = orgName(r.e, d.key); if (!g.has(k)) g.set(k, []); g.get(k)!.push(r); }
    for (const [k, rs] of [...g.entries()].sort((a, b) => b[1].length - a[1].length)) {
      const x = summarize(rs);
      out.push([k, x.total, x.scored, x.byClass['HIGH ALIGNMENT'], x.byClass['MEDIUM ALIGNMENT'], x.byClass['LOW ALIGNMENT'], pct(x.byClass['HIGH ALIGNMENT'], x.scored),
        x.averageScore === null ? NA : Math.round(x.averageScore * 10) / 10, x.incomplete, x.unmapped, x.noData]);
    }
    out.push([]);
  }
  return out;
}

export function unmappedValueRows(rows: AlignmentRow<Employee>[]): Row[] {
  const m = new Map<string, { st: number; lt: number }>();
  for (const { a } of rows) for (const side of ['shortTerm', 'longTerm'] as const) {
    if (a[side].status !== 'unmapped') continue;
    const k = a[side].original;
    if (!m.has(k)) m.set(k, { st: 0, lt: 0 });
    m.get(k)![side === 'shortTerm' ? 'st' : 'lt']++;
  }
  return [['Unmapped value (original text)', 'Short-Term occurrences', 'Long-Term occurrences'], ...[...m.entries()].sort((a, b) => b[1].st + b[1].lt - a[1].st - a[1].lt).map(([k, v]) => [k, v.st, v.lt])];
}
