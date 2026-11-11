// Mandatory acceptance tests for the approved 70:30 Aspiration Alignment model.
// Run: npm run test:alignment   (bundles with esbuild, runs on Node; synthetic data only)
import { calculateAspirationAlignment, classifyAlignment, evaluateEmployeeAlignment, summarize } from '../src/analytics/aspirationAlignment';
import { APPROVED_CATEGORIES, matchApprovedCategory } from '../src/analytics/aspirationCategoryMapping';
import { autoMap, columnLetter } from '../src/lib/fields';
import type { CategoryPoint } from '../src/types/aspirationAlignment';

let pass = 0, fail = 0;
const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;
function test(name: string, ok: boolean, detail = '') { if (ok) pass++; else fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }

// 1–9: all nine combinations
const nine: [CategoryPoint, CategoryPoint, string, string][] = [
  [3, 3, '100.0%', 'HIGH ALIGNMENT'], [3, 2, '90.0%', 'HIGH ALIGNMENT'], [3, 1, '80.0%', 'HIGH ALIGNMENT'],
  [2, 3, '76.7%', 'MEDIUM ALIGNMENT'], [2, 2, '66.7%', 'MEDIUM ALIGNMENT'], [2, 1, '56.7%', 'MEDIUM ALIGNMENT'],
  [1, 3, '53.3%', 'LOW ALIGNMENT'], [1, 2, '43.3%', 'LOW ALIGNMENT'], [1, 1, '33.3%', 'LOW ALIGNMENT'],
];
const lvl = { 3: 'High', 2: 'Medium', 1: 'Low' } as const;
nine.forEach(([st, lt, score, cls], i) => {
  const r = calculateAspirationAlignment(st, lt);
  const expectedRaw = ((st * 0.7) + (lt * 0.3)) / 3 * 100;
  test(`${i + 1}. ${lvl[st]} (${st}) / ${lvl[lt]} (${lt}) = ${score} ${cls.split(' ')[0]}`,
    r.displayAlignmentScore === score && r.alignmentClassification === cls && near(r.rawAlignmentScore, expectedRaw),
    `got ${r.displayAlignmentScore} ${r.alignmentClassification} (raw ${r.rawAlignmentScore})`);
});

// Breakdown example from the spec: High/Medium → 2.10 + 0.60 = 2.70 → 90.0%
const ex = calculateAspirationAlignment(3, 2);
test('Breakdown 3×70% = 2.10, 2×30% = 0.60, total 2.70', ex.shortTermWeightedPoint.toFixed(2) === '2.10' && ex.longTermWeightedPoint.toFixed(2) === '0.60' && ex.totalWeightedPoint.toFixed(2) === '2.70');

// Missing / unmapped data
const ms = evaluateEmployeeAlignment('', 'Development');
test('10. Missing Short-Term → INCOMPLETE DATA, no score, LT point kept', ms.status === 'INCOMPLETE DATA' && ms.result === null && ms.longTerm.category?.point === 2 && ms.shortTerm.category === null);
const ml = evaluateEmployeeAlignment('Career Opportunity', '#N/A');
test('11. Missing Long-Term → INCOMPLETE DATA, no score, ST point kept', ml.status === 'INCOMPLETE DATA' && ml.result === null && ml.shortTerm.category?.point === 3 && ml.longTerm.category === null);
const mb = evaluateEmployeeAlignment('N/A', '-');
test('12. Both missing (N/A, "-") → NO ASPIRATION DATA', mb.status === 'NO ASPIRATION DATA' && mb.result === null);
const um = evaluateEmployeeAlignment('Career Opportunities Abroad', 'Development');
test('13. Unmapped category → UNMAPPED CATEGORY, not scored', um.status === 'UNMAPPED CATEGORY' && um.result === null && um.shortTerm.status === 'unmapped');
test('13b. No partial matching ("Development Program" ≠ Development)', matchApprovedCategory('Development Program') === null && matchApprovedCategory('Career') === null);

// Matching
test('14. Case-insensitive ("CAREER OPPORTUNITY", "career opportunity")', matchApprovedCategory('CAREER OPPORTUNITY')?.point === 3 && matchApprovedCategory('career opportunity')?.point === 3);
test('15. Extra whitespace ("  Synergy  Collaboration &  Competent Personnel ")', matchApprovedCategory('  Synergy  Collaboration &  Competent Personnel ')?.name === 'Synergy Collaboration & Competent Personnel');
test('All 10 approved categories map to the approved points', APPROVED_CATEGORIES.length === 10 &&
  APPROVED_CATEGORIES.every((c) => matchApprovedCategory(c.name)?.point === c.point) &&
  APPROVED_CATEGORIES.map((c) => c.point).join('') === '3222111212');

// Boundaries (classification on unrounded score)
test('16. 80.000% → HIGH', classifyAlignment(80) === 'HIGH ALIGNMENT');
test('17. 79.999% → MEDIUM (displays 80.0%)', classifyAlignment(79.999) === 'MEDIUM ALIGNMENT' && (79.999).toFixed(1) === '80.0');
test('18. 55.000% → MEDIUM', classifyAlignment(55) === 'MEDIUM ALIGNMENT');
test('19. 54.999% → LOW', classifyAlignment(54.999) === 'LOW ALIGNMENT');
const all = ([1, 2, 3] as CategoryPoint[]).flatMap((s) => ([1, 2, 3] as CategoryPoint[]).map((l) => calculateAspirationAlignment(s, l).rawAlignmentScore));
test('Max = 100%, min = 33.333…%, never outside range', near(Math.max(...all), 100) && near(Math.min(...all), 100 / 3) && all.every((x) => x <= 100 + 1e-9 && x >= 100 / 3 - 1e-9));

// 20. Filters change population only, never individual scores
type E = { co: string; st: string; lt: string };
const emps: E[] = [
  { co: 'A', st: 'Career Opportunity', lt: 'Purpose' }, { co: 'A', st: 'Infrastructure', lt: 'Infrastructure' },
  { co: 'B', st: 'Development', lt: 'Career Opportunity' }, { co: 'B', st: '', lt: 'Development' }, { co: 'B', st: 'Unknown thing', lt: 'Purpose' },
];
const rows = emps.map((e) => ({ e, a: evaluateEmployeeAlignment(e.st, e.lt) }));
const sAll = summarize(rows);
const rowsB = rows.filter((r) => r.e.co === 'B');
const sB = summarize(rowsB);
test('20. Filter recalculation: totals/denominators update', sAll.total === 5 && sAll.scored === 3 && sB.total === 3 && sB.scored === 1 && sB.incomplete === 1 && sB.unmapped === 1 && sB.byClass['MEDIUM ALIGNMENT'] === 1);
test('20b. Individual score identical before and after filtering', rowsB[0].a.result!.rawAlignmentScore === rows[2].a.result!.rawAlignmentScore);

// Excel columns: AT = Short-Term, AV = Long-Term (not AS / AU)
const H = [...Array(44).fill('x').map((_, i) => `col${i}`), 'Short Term', 'CONV-Short Term Aspiration', 'Long Term', 'CONV-Long Term Aspiration'];
const m = autoMap(H);
test('Excel AT read as Short-Term, AV as Long-Term (AU not used)', columnLetter(m.shortTermAspiration!) === 'AT' && columnLetter(m.longTermAspiration!) === 'AV');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) (globalThis as { process?: { exit(c: number): void } }).process?.exit(1);
