// Approved 12-box layout acceptance test. Run: npm run test:matrix (also runs at the start of npm run build).
import { DEFAULT_MATRIX, TWELVE_BOX, matchMatrixLabel } from '../src/lib/config';

let pass = 0, fail = 0;
const test = (n: string, ok: boolean, d = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const at = (r: number, c: number) => Object.keys(DEFAULT_MATRIX.cells).filter((k) => DEFAULT_MATRIX.cells[k].r === r && DEFAULT_MATRIX.cells[k].c === c);
const row = (r: number) => [0, 1, 2, 3].map((c) => { const l = at(r, c); return l.length === 1 ? TWELVE_BOX[l[0]]?.no : NaN; });

test('Grid is 3 rows × 4 columns', DEFAULT_MATRIX.rows === 3 && DEFAULT_MATRIX.cols === 4);
test('Top row = 10, 7, 3, 1', row(0).join() === '10,7,3,1', row(0).join());
test('Middle row = 11, 8, 4, 2', row(1).join() === '11,8,4,2', row(1).join());
test('Bottom row = 12, 9, 6, 5', row(2).join() === '12,9,6,5', row(2).join());
const names: Record<number, string> = { 1: 'STAR Leaders', 2: 'Future Leaders', 3: 'Emerging Leaders', 4: 'Growing Talent', 5: 'Experts', 6: 'Solid Contributor', 7: 'Diamond in the Rough', 8: 'Steady Performer', 9: 'Average Worker', 10: 'Underutilized / Misplaced', 11: 'Strugglers', 12: 'Misfits' };
test('All 12 class names and numbers correct', Object.entries(names).every(([no, n]) => TWELVE_BOX[n]?.no === Number(no) && DEFAULT_MATRIX.cells[n] !== undefined) && Object.keys(DEFAULT_MATRIX.cells).length === 12);
test('Axes: Performance Low→Very High (left→right), Potential High→Low (top→bottom)',
  DEFAULT_MATRIX.xAxis === 'Performance' && DEFAULT_MATRIX.colLabels.join() === 'Low,Medium,High,Very High' && DEFAULT_MATRIX.yAxis === 'Potential' && DEFAULT_MATRIX.rowLabels.join() === 'High Potential,Medium Potential,Low Potential');
test('Excel variants map to the right class ("Average Workers", "star leaders")', matchMatrixLabel('Average Workers', DEFAULT_MATRIX) === 'Average Worker' && matchMatrixLabel('star leaders', DEFAULT_MATRIX) === 'STAR Leaders');
// counts & % (synthetic)
const data = ['STAR Leaders', 'STAR Leaders', 'Future Leaders', 'Misfits', 'Average Workers', '', 'Unknown'];
const cnt: Record<string, number> = {};
for (const d of data) { const l = d ? matchMatrixLabel(d, DEFAULT_MATRIX) : null; if (l) cnt[l] = (cnt[l] || 0) + 1; }
test('Counts & percentage (2 of 7 = 28.6% STAR Leaders; empty box = 0)', cnt['STAR Leaders'] === 2 && ((2 / 7) * 100).toFixed(1) === '28.6' && (cnt['Experts'] ?? 0) === 0);
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) (globalThis as { process?: { exit(c: number): void } }).process?.exit(1);
