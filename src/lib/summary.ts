// Builds an AGGREGATED analytics workbook (counts and percentages only — no employee-level records).
import { Employee, isSuccessor, isYes, NA } from './model';
import { AppConfig, compareRank } from './config';
import { countBy, groupBy, isTalent, isCalibTalent, mean, ORG_DIMS, orgName, pct, perfTrend, val, YearView } from './analytics';
import { FieldKey } from './fields';

type Row = (string | number | null)[];
const r1 = (n: number) => Math.round(n * 10) / 10;

export function buildSummary(list: Employee[], config: AppConfig, year: YearView, filterText: string) {
  const n = list.length;
  const count = (f: (e: Employee) => boolean) => list.filter(f).length;
  const mv = (e: Employee) => compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY);
  const calibChanged = (e: Employee) => !!(e.v.talentCY && e.v.calibCY && e.v.talentCY.toLowerCase() !== e.v.calibCY.toLowerCase());

  const kpi: Row[] = [
    ['Talent Analytics Compass — analytics summary'], ['Generated', new Date().toLocaleString()], ['Filters', filterText || 'None'], ['Talent year view', year === 'current' ? 'Current year' : 'Last year'], [],
    ['Metric', 'Count', '% of employees'],
    ['Total employees', n, 100],
    ['Total talent', count((e) => isTalent(e, year)), r1(pct(count((e) => isTalent(e, year)), n))],
    ['Calibrated talent', count((e) => isCalibTalent(e, year)), r1(pct(count((e) => isCalibTalent(e, year)), n))],
    ['Identified successors', count((e) => isSuccessor(e.v.successor)), r1(pct(count((e) => isSuccessor(e.v.successor)), n))],
    ['Hidden gems', count((e) => isYes(e.v.hiddenGems)), r1(pct(count((e) => isYes(e.v.hiddenGems)), n))],
    ['Free riders', count((e) => isYes(e.v.freeRider)), r1(pct(count((e) => isYes(e.v.freeRider)), n))],
    ['Low performers', count((e) => isYes(e.v.lowPerformer)), r1(pct(count((e) => isYes(e.v.lowPerformer)), n))],
    ['Talent upgrade (LY→CY)', count((e) => mv(e) === 'Upgrade'), r1(pct(count((e) => mv(e) === 'Upgrade'), n))],
    ['Talent downgrade (LY→CY)', count((e) => mv(e) === 'Downgrade'), r1(pct(count((e) => mv(e) === 'Downgrade'), n))],
    ['Talent stagnation (no change)', count((e) => mv(e) === 'Stable'), r1(pct(count((e) => mv(e) === 'Stable'), n))],
    ['Calibration changes (Talent CY ≠ Calib CY)', count(calibChanged), r1(pct(count(calibChanged), n))],
  ];

  const dist = (title: string, k: FieldKey): Row[] => [[title, 'Employees', '%'], ...countBy(list, (e) => val(e, k)).map((c) => [c.name, c.value, r1(pct(c.value, n))]), []];
  const distribution: Row[] = [
    ...dist('Talent Category', 'talentCategory'), ...dist('Talent Cluster', 'talentCluster'), ...dist('Talent Class 12 Box', 'talent12Box'),
    ...dist('TL Class Calibration', 'tlClassCalibration'), ...dist('Talent (Current year)', 'talentCY'), ...dist('Talent (Last year)', 'talentLY'),
    ...dist('Talent Calib (Current year)', 'calibCY'), ...dist('Talent Calib (Last year)', 'calibLY'),
  ];

  const transition = (title: string, a: FieldKey, b: FieldKey): Row[] => {
    const rows = [...new Set(list.map((e) => val(e, a)))].sort();
    const cols = [...new Set(list.map((e) => val(e, b)))].sort();
    return [[title], [`${a} \\ ${b}`, ...cols], ...rows.map((r) => [r, ...cols.map((c) => list.filter((e) => val(e, a) === r && val(e, b) === c).length)]), []];
  };
  const calibration: Row[] = [
    ...transition('Talent: Last year → Current year', 'talentLY', 'talentCY'),
    ...transition('Calibration: Last year → Current year', 'calibLY', 'calibCY'),
    ...transition('Nomination vs calibration (Current year)', 'talentCY', 'calibCY'),
  ];

  const org: Row[] = [];
  for (const d of ORG_DIMS) {
    org.push([`By ${d.label}`, 'Headcount', 'Talent', 'Talent density %', 'Successors', 'Successor coverage %', 'Hidden gems', 'Free riders', 'Low performers', 'Upgrade', 'Downgrade', 'Stagnation']);
    for (const [name, es] of groupBy(list, (e) => orgName(e, d.key))) {
      const t = es.filter((e) => isTalent(e, year)).length;
      const s = es.filter((e) => isSuccessor(e.v.successor)).length;
      org.push([name, es.length, t, r1(pct(t, es.length)), s, r1(pct(s, es.length)), es.filter((e) => isYes(e.v.hiddenGems)).length, es.filter((e) => isYes(e.v.freeRider)).length, es.filter((e) => isYes(e.v.lowPerformer)).length,
        es.filter((e) => mv(e) === 'Upgrade').length, es.filter((e) => mv(e) === 'Downgrade').length, es.filter((e) => mv(e) === 'Stable').length]);
    }
    org.push([]);
  }

  const perf: Row[] = [['Year', 'Year label', 'Employees with score', 'Average score']];
  for (const k of [1, 2, 3] as const) {
    const label = countBy(list, (e) => e.v[`y${k}Year` as FieldKey]).find((c) => c.name !== NA)?.name ?? NA;
    const sc = list.map((e) => e.n[`y${k}Score` as 'y1Score']);
    const m = mean(sc);
    perf.push([`Year -${k}`, label, sc.filter((x) => x !== null).length, m === null ? NA : r1(m)]);
  }
  perf.push([], ['Average PAT (mean)', mean(list.map((e) => e.n.avgPat)) ?? NA], []);
  perf.push(['Performance trend', 'Employees', '%'], ...countBy(list, perfTrend).map((c) => [c.name, c.value, r1(pct(c.value, n))]));
  for (const k of [1, 2, 3] as const) perf.push([], ...dist(`Year -${k} Scale`, `y${k}Scale` as FieldKey));

  return [
    { name: 'Summary KPIs', rows: kpi },
    { name: 'Talent Distribution', rows: distribution },
    { name: 'Calibration', rows: calibration },
    { name: 'Organization', rows: org },
    { name: 'Performance', rows: perf },
  ];
}
