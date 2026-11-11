// Synthetic-data logic test. Run: npx esbuild tests/aspiration.test.ts --bundle --platform=node --outfile=/tmp/t.cjs && node /tmp/t.cjs
import { autoMap, columnLetter } from '../src/lib/fields';
import { buildEmployees } from '../src/lib/model';
import { DEFAULT_ASPIRATION_CATEGORIES as C, UNCLASSIFIED } from '../src/lib/config';
import { analyse, categoryCounts, coverageOf, parseEntries } from '../src/lib/aspiration';
const H = ['Personnel Number','Employee Name','Company Name','Personnel Area Text','Pers. subarea text','Position Name','Talent (Last year)','Talent (Current year)','Talent Calib (Last year)','Talent Calib (Current year)','Business Unit Name','Directorate','Directorate Name','Division','Division Name','Department','Department Name','Yrs in Current Pos','Yrs in Current Gol','Average PAT','Hidden Gems','Free Rider','Low Performer Category','Low Performer','Identified as Successor','Reviewer NIK','Reviewer Name','Last Change','Year -1','Scale','Score','Year -2','Scale','Score','Year -3','Path','Education Scale','Strength','Weakness','TL Class Calibration','Talent Class 12 Box Text','Talent Cluster Text','Talent Category','C-Level','Short Term','CONV-Short Term Aspiration','Long Term','CONV-Long Term Aspiration'];
let fails = 0; const check = (name: string, ok: boolean, info: unknown = '') => { console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : JSON.stringify(info)); if (!ok) fails++; };
const m = autoMap(H);
check('AS = Short Term', columnLetter(m.shortTermOriginal!) === 'AS', columnLetter(m.shortTermOriginal!));
check('AT = CONV-Short Term Aspiration', columnLetter(m.shortTermAspiration!) === 'AT', columnLetter(m.shortTermAspiration!));
check('AU = Long Term', columnLetter(m.longTermOriginal!) === 'AU', columnLetter(m.longTermOriginal!));
check('AV = CONV-Long Term Aspiration', columnLetter(m.longTermAspiration!) === 'AV', columnLetter(m.longTermAspiration!));
check('Scale/Score still by year', [m.y1Scale, m.y1Score, m.y2Scale, m.y2Score].map((x) => columnLetter(x!)).join() === 'AD,AE,AG,AH');
const row = (id: string, co: string, pos: string, st: string, lt: string) => { const r = H.map(() => ''); r[0] = id; r[1] = 'Test ' + id; r[2] = co; r[5] = pos; r[44] = 'ORIG ' + id; r[45] = st; r[46] = 'ORIGL ' + id; r[47] = lt; return r; };
const rows = [
  row('1', 'A', 'Finance Manager', 'Head of Finance', 'Finance Director'),
  row('2', 'A', 'HR Officer', 'HR Business Partner', 'CHRO'),
  row('3', 'B', 'Finance Analyst', 'Sales Manager', 'Head of Strategy'),
  row('4', 'B', 'Engineer', 'N/A', '#N/A'),
  row('5', 'B', 'Engineer', '-', 'General Manager'),
  row('6', 'A', 'Accountant', 'Operations Manager; Plant Manager', ''),
  row('7', 'A', 'Analyst', 'Something unusual', 'Something unusual too'),
];
const res = buildEmployees({ fileName: 't', sheetName: 's', headerRow: 0, importedAt: '', headers: H, rows }, m);
const e1 = res.employees[0];
check('ST reads AT (not AS)', e1.v.shortTermAspiration === 'Head of Finance' && e1.v.shortTermOriginal === 'ORIG 1');
check('LT reads AV (not AU)', e1.v.longTermAspiration === 'Finance Director' && e1.v.longTermOriginal === 'ORIGL 1');
check('N/A and #N/A → missing', res.employees[3].v.shortTermAspiration === '' && res.employees[3].v.longTermAspiration === '');
check('"-" → missing', res.employees[4].v.shortTermAspiration === '');
check('source row untouched', rows[3][45] === 'N/A');
check('multi-entry split', parseEntries('Operations Manager; Plant Manager', C).length === 2);
const a = analyse(res.employees, C);
const cat = (i: number, h: 'short' | 'long') => (h === 'short' ? a[i].short : a[i].long).map((x) => `${x.category}|${x.fn}`).join(',');
console.log(' categories:', a.map((r, i) => `${i + 1}: ST[${cat(i, 'short')}] LT[${cat(i, 'long')}] → ${r.pattern ?? '-'} (${coverageOf(r)})`).join('\n             '));
check('Head of Finance → Director/Functional Head, fn Finance', cat(0, 'short') === 'Director / Functional Head|Finance');
check('CHRO → Leadership/C-Level', a[1].long[0].category === 'Leadership / C-Level');
check('Unclassified kept', a[6].short[0].category === UNCLASSIFIED && a[6].short[0].original === 'Something unusual');
check('Coverage both/ST only/LT only/none', [coverageOf(a[0]), coverageOf(a[5]), coverageOf(a[4]), coverageOf(a[3])].join('|') === 'Both short- and long-term|Short-term only|Long-term only|No aspiration data');
check('Pattern consistent (Head of Finance → Finance Director)', a[0].pattern === 'Consistent Career Direction', a[0].pattern);
check('Pattern leadership (HRBP → CHRO)', a[1].pattern === 'Leadership Aspiration', a[1].pattern);
check('Patterns Sales → Head of Strategy: leadership + functional mobility', a[2].patterns.includes('Leadership Aspiration') && a[2].patterns.includes('Functional Mobility Interest'), a[2].patterns);
const cc = categoryCounts(a, 'short');
const total = a.length;
check('category count & %', cc.get('Director / Functional Head')!.length === 1 && Math.abs(1 / total * 100 - 14.2857) < 0.01);
// filter simulation: Company B only
const fb = analyse(res.employees.filter((e) => e.v.companyName === 'B'), C);
check('filter recalculates (Company B: 3 employees, 2 with LT)', fb.length === 3 && fb.filter((r) => r.long.length).length === 2);
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
