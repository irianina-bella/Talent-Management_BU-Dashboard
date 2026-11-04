import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { CrossTabTable } from '../components/CrossTabTable';
import { Kpi, Section, PageHeader, BarList, Select, C, PALETTE, clickName } from '../components/ui';
import { countBy, crossTab, groupBy, mean, perfTrend, val, isTalent, fmtNum } from '../lib/analytics';
import { Employee, NA } from '../lib/model';
import { FieldKey } from '../lib/fields';
import { sortByRank } from '../lib/config';

type Y = 1 | 2 | 3;
const scaleKey = (n: Y) => `y${n}Scale` as FieldKey;
const scoreOf = (e: Employee, n: Y) => e.n[`y${n}Score` as 'y1Score'];

function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

const mode = (vals: string[]) => {
  const c = new Map<string, number>();
  vals.filter(Boolean).forEach((v) => c.set(v, (c.get(v) || 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
};

export default function PerformancePage() {
  const { filtered: list, filters, config, openList } = useApp();
  const [groupField, setGroupField] = useState<FieldKey>('talent12Box');
  const years = useMemo(() => ([1, 2, 3] as Y[]).map((n) => ({ n, label: mode(list.map((e) => e.v[`y${n}Year` as FieldKey])) || `Year -${n}` })), [list]);
  const yLabel = (n: Y) => years.find((y) => y.n === n)!.label;

  // Scale order derived from data: scales sorted by their observed mean score (high → low).
  const scales = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const e of list) for (const n of [1, 2, 3] as Y[]) {
      const s = e.v[scaleKey(n)];
      if (!s) continue;
      if (!m.has(s)) m.set(s, []);
      const sc = scoreOf(e, n);
      if (sc !== null) m.get(s)!.push(sc);
    }
    return [...m.entries()].map(([s, arr]) => ({ s, avg: mean(arr) ?? -Infinity })).sort((a, b) => b.avg - a.avg || a.s.localeCompare(b.s)).map((x) => x.s);
  }, [list]);

  const scaleDist = useMemo(() => scales.map((s) => {
    const row: Record<string, string | number> = { scale: s };
    for (const n of [3, 2, 1] as Y[]) row[yLabel(n)] = list.filter((e) => e.v[scaleKey(n)] === s).length;
    return row;
  }), [scales, list, years]);

  const trend = useMemo(() => ([3, 2, 1] as Y[]).map((n) => ({
    year: yLabel(n),
    'All employees': mean(list.map((e) => scoreOf(e, n))),
    'Talent (selected year)': mean(list.filter((e) => isTalent(e, filters.year)).map((e) => scoreOf(e, n))),
    'Non-talent': mean(list.filter((e) => !isTalent(e, filters.year)).map((e) => scoreOf(e, n))),
    coverage: list.filter((e) => scoreOf(e, n) !== null).length,
  })), [list, filters.year, years]);

  const consistency = useMemo(() => countBy(list, perfTrend), [list]);
  const byGroup = useMemo(() => {
    const g = groupBy(list, (e) => val(e, groupField));
    const rank = groupField === 'talent12Box' ? config.ranks.talent12Box : groupField === 'talentCluster' ? config.ranks.talentCluster : groupField === 'talentCategory' ? config.ranks.talentCategory : [];
    return sortByRank([...g.keys()], rank).map((k) => {
      const es = g.get(k)!;
      const r: Record<string, string | number | null> = { name: k, n: es.length };
      for (const n of [3, 2, 1] as Y[]) r[yLabel(n)] = mean(es.map((e) => scoreOf(e, n)));
      return r;
    });
  }, [list, groupField, config, years]);

  const corr = useMemo(() => {
    const withY1 = list.filter((e) => e.n.y1Score !== null && (e.v.talentCY || e.v.talentLY));
    const t = withY1.filter((e) => (filters.year === 'current' ? e.v.talentCY : e.v.talentLY));
    const r1 = pearson(t.map((e) => (isTalent(e, filters.year) ? 1 : 0)), t.map((e) => e.n.y1Score!));
    const p = list.filter((e) => e.n.avgPat !== null && e.n.y1Score !== null);
    const r2 = pearson(p.map((e) => e.n.avgPat!), p.map((e) => e.n.y1Score!));
    const g = list.filter((e) => e.n.y1Score !== null && e.n.y2Score !== null);
    const r3 = pearson(g.map((e) => e.n.y2Score!), g.map((e) => e.n.y1Score!));
    return { r1, n1: t.length, r2, n2: p.length, r3, n3: g.length };
  }, [list, filters.year]);

  const ct = useMemo(() => crossTab(list, (e) => val(e, 'talent12Box'), (e) => val(e, 'y1Scale'), config.ranks.talent12Box, scales), [list, config, scales]);
  const fmtR = (r: number | null) => (r === null ? NA : r.toFixed(2));

  return (
    <div>
      <PageHeader title="Talent Performance History" subtitle="Year -1, Year -2 and Year -3 performance scale and score. Duplicated Scale/Score columns are resolved to their respective years." />
      <FilterBar />
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-6">
        {([1, 2, 3] as Y[]).map((n) => (
          <Kpi key={n} label={`Avg score · ${yLabel(n)}`} value={fmtNum(mean(list.map((e) => scoreOf(e, n))))} sub={`${list.filter((e) => scoreOf(e, n) !== null).length} employees with score`} tone={n === 1 ? 'teal' : 'navy'} />
        ))}
        <Kpi label="Talent ↔ Y-1 score (r)" value={fmtR(corr.r1)} sub={`point-biserial · n=${corr.n1}`} />
        <Kpi label="Avg PAT ↔ Y-1 score (r)" value={fmtR(corr.r2)} sub={`Pearson · n=${corr.n2}`} />
        <Kpi label="Y-2 ↔ Y-1 score (r)" value={fmtR(corr.r3)} sub={`score stability · n=${corr.n3}`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Performance trend" subtitle="Average score per year (only employees with a score are counted)">
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ left: 0, right: 16, top: 8 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="year" />
                <YAxis domain={['auto', 'auto']} />
                <Tooltip formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : NA)} />
                <Legend />
                <Line type="monotone" dataKey="All employees" stroke={C.navy} strokeWidth={2} dot connectNulls />
                <Line type="monotone" dataKey="Talent (selected year)" stroke={C.teal} strokeWidth={2} dot connectNulls />
                <Line type="monotone" dataKey="Non-talent" stroke="#94A3B8" strokeWidth={2} strokeDasharray="4 3" dot connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Historical scale distribution" subtitle="Scales ordered by their observed average score">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={scaleDist} margin={{ left: 0, right: 10, top: 8 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="scale" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {([3, 2, 1] as Y[]).map((n, i) => <Bar key={n} dataKey={yLabel(n)} fill={[ '#B8C4D6', '#5B7BA6', C.teal ][i]} radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(d) => { const s = (d as { payload?: { scale?: string } })?.payload?.scale; if (s) openList({ title: `${yLabel(n)} scale ${s}`, employees: list.filter((e) => e.v[scaleKey(n)] === s) }); }} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Performance consistency" subtitle="Direction of score across Year -3 → Year -2 → Year -1 (≥ 2 years of scores required)">
          <BarList data={consistency} total={list.length} onClick={(t) => openList({ title: `Performance trend: ${t}`, employees: list.filter((e) => perfTrend(e) === t) })} />
        </Section>
        <Section title="Talent vs performance" subtitle="Average score by talent classification" action={<Select value={groupField} onChange={(v) => setGroupField(v as FieldKey)} options={[{ value: 'talent12Box', label: '12 Box' }, { value: 'talentCategory', label: 'Talent Category' }, { value: 'talentCluster', label: 'Talent Cluster' }, { value: 'talentCY', label: 'Talent (CY)' }, { value: 'calibCY', label: 'Calib (CY)' }]} />}>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={byGroup} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid stroke={C.grid} horizontal={false} />
                <XAxis type="number" domain={[0, 'auto']} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : NA)} />
                <Legend />
                {([3, 2, 1] as Y[]).map((n, i) => <Bar key={n} dataKey={yLabel(n)} fill={[PALETTE[5], PALETTE[2], C.teal][i]} cursor="pointer"
                  onClick={(d) => { const k = clickName(d); if (k) openList({ title: `${k}`, employees: list.filter((e) => val(e, groupField) === k) }); }} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>
      <Section title={`12 Box vs ${yLabel(1)} performance scale`} subtitle="Cross-check of talent classification against most recent performance" className="mt-5">
        <CrossTabTable tab={ct} rowTitle="12 Box" colTitle={`${yLabel(1)} scale`} highlightDiagonal={false} />
      </Section>
    </div>
  );
}
