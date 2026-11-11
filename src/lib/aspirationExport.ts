// Career aspiration export. The analysis workbook holds aggregated counts only;
// employee-level details are included only when the user explicitly asks for them.
import { AspirationCategory, UNCLASSIFIED } from './config';
import { EmpAsp, categoryCounts, topTexts, COVERAGE, coverageOf, PATTERNS, Horizon, HORIZON_LABEL, simBucket } from './aspiration';
import { ORG_DIMS, orgName, pct } from './analytics';

type Row = (string | number | null)[];
const r1 = (n: number) => Math.round(n * 10) / 10;

function horizonSheet(rows: EmpAsp[], h: Horizon, cats: AspirationCategory[], filterText: string): Row[] {
  const total = rows.length;
  const withAsp = rows.filter((r) => (h === 'short' ? r.short : r.long).length).length;
  const order = [...cats.map((c) => c.name), UNCLASSIFIED];
  const cc = categoryCounts(rows, h);
  const fc = categoryCounts(rows, h, 'fn');
  const out: Row[] = [
    [`${HORIZON_LABEL[h]} Career Aspiration Analysis`], ['Source column', h === 'short' ? 'CONV-Short Term Aspiration' : 'CONV-Long Term Aspiration'],
    ['Filters', filterText || 'None'], ['Generated', new Date().toLocaleString()], [],
    ['Employees in scope', total], ['With aspiration', withAsp, r1(pct(withAsp, total))], ['No aspiration data', total - withAsp, r1(pct(total - withAsp, total))], [],
    ['Category', 'Employees', '% of employees'], ...order.filter((c) => cc.has(c)).map((c) => [c, cc.get(c)!.length, r1(pct(cc.get(c)!.length, total))]), [],
    ['Functional interest', 'Employees', '% of employees'], ...[...fc.entries()].sort((a, b) => b[1].length - a[1].length).map(([c, rs]) => [c, rs.length, r1(pct(rs.length, total))]), [],
    ['Aspiration (original text)', 'Category', 'Employees', '% of employees'], ...topTexts(rows, h).map((t) => [t.name, t.category, t.rows.length, r1(pct(t.rows.length, total))]), [],
  ];
  for (const d of ORG_DIMS.filter((x) => ['company', 'bu', 'directorate', 'division', 'department'].includes(x.key))) {
    out.push([`By ${d.label}`, 'Employees', 'With aspiration', ...order]);
    const units = new Map<string, EmpAsp[]>();
    for (const r of rows) { const u = orgName(r.e, d.key); if (!units.has(u)) units.set(u, []); units.get(u)!.push(r); }
    for (const [u, rs] of [...units.entries()].sort((a, b) => b[1].length - a[1].length)) {
      out.push([u, rs.length, rs.filter((r) => (h === 'short' ? r.short : r.long).length).length, ...order.map((c) => rs.filter((r) => (h === 'short' ? r.short : r.long).some((x) => x.category === c)).length)]);
    }
    out.push([]);
  }
  return out;
}

export function buildAspirationWorkbook(rows: EmpAsp[], cats: AspirationCategory[], filterText: string, includeDetails: boolean) {
  const total = rows.length;
  const both = rows.filter((r) => r.pattern);
  const compare: Row[] = [
    ['Short-Term vs Long-Term Comparison'], ['Filters', filterText || 'None'], [],
    ['Coverage', 'Employees', '% of employees'], ...COVERAGE.map((c) => { const n = rows.filter((r) => coverageOf(r) === c).length; return [c, n, r1(pct(n, total))]; }), [],
    ['Pattern (employees with both; may overlap)', 'Employees', '% of employees with both'], ...PATTERNS.map((p) => { const n = both.filter((r) => r.patterns.includes(p)).length; return [p, n, r1(pct(n, both.length))]; }), [],
    ['Text similarity', 'Employees'], ...['High overlap (≥ 60%)', 'Partial overlap (20–59%)', 'Low overlap (< 20%)', 'Not comparable'].map((b) => [b, both.filter((r) => simBucket(r.similarity) === b).length]), [],
    ['Patterns are descriptive comparisons of employee-written text, not assessments of readiness or potential.'],
  ];
  const sheets = [
    { name: 'Short-Term Analysis', rows: horizonSheet(rows, 'short', cats, filterText) },
    { name: 'Long-Term Analysis', rows: horizonSheet(rows, 'long', cats, filterText) },
    { name: 'ST vs LT Comparison', rows: compare },
  ];
  if (includeDetails) {
    sheets.push({
      name: 'Employee Aspiration Details',
      rows: [
        ['Personnel Number', 'Employee Name', 'Company', 'Business Unit', 'Directorate', 'Division', 'Department', 'Current Position',
          'Short Term (original)', 'CONV-Short Term Aspiration', 'Short-Term Category', 'Long Term (original)', 'CONV-Long Term Aspiration', 'Long-Term Category', 'ST vs LT Pattern'],
        ...rows.map((r) => {
          const v = r.e.v;
          return [v.personnelNumber, v.employeeName, v.companyName, v.businessUnit, v.directorateName, v.divisionName, v.departmentName, v.positionName,
            v.shortTermOriginal || 'N/A', v.shortTermAspiration || 'N/A', r.short.map((x) => x.category).join('; ') || 'N/A',
            v.longTermOriginal || 'N/A', v.longTermAspiration || 'N/A', r.long.map((x) => x.category).join('; ') || 'N/A', r.patterns.join('; ') || 'N/A'];
        }),
      ],
    });
  }
  return sheets;
}
