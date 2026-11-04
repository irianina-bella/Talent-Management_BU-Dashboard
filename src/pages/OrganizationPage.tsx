import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { Section, PageHeader, Select, BarList, C, PALETTE, cx } from '../components/ui';
import { ORG_DIMS, OrgDim, groupBy, orgName, isTalent, isCalibTalent, isSuccessor, isYes, val, pct, uniqueValues } from '../lib/analytics';
import { sortByRank } from '../lib/config';
import { NA, Employee } from '../lib/model';

type Metric = 'talent' | 'calib' | 'successor' | 'low' | 'gems' | 'riders';
const METRICS: { key: Metric; label: string; fn: (e: Employee, y: 'current' | 'last') => boolean }[] = [
  { key: 'talent', label: 'Talent', fn: (e, y) => isTalent(e, y) },
  { key: 'calib', label: 'Calibrated Talent', fn: (e, y) => isCalibTalent(e, y) },
  { key: 'successor', label: 'Successors', fn: (e) => isSuccessor(e.v.successor) },
  { key: 'low', label: 'Low Performers', fn: (e) => isYes(e.v.lowPerformer) },
  { key: 'gems', label: 'Hidden Gems', fn: (e) => isYes(e.v.hiddenGems) },
  { key: 'riders', label: 'Free Riders', fn: (e) => isYes(e.v.freeRider) },
];

export default function OrganizationPage() {
  const { filtered: list, filters, config, openList } = useApp();
  const [dim, setDim] = useState<OrgDim>('company');
  const [metric, setMetric] = useState<Metric>('talent');
  const [sortKey, setSortKey] = useState<string>('n');
  const y = filters.year;
  const dimLabel = ORG_DIMS.find((d) => d.key === dim)!.label;

  const rows = useMemo(() => {
    const g = groupBy(list, (e) => orgName(e, dim));
    const totals = Object.fromEntries(METRICS.map((m) => [m.key, list.filter((e) => m.fn(e, y)).length]));
    return [...g.entries()].map(([name, es]) => {
      const r: Record<string, number | string> = { name, n: es.length };
      for (const m of METRICS) {
        const c = es.filter((e) => m.fn(e, y)).length;
        r[m.key] = c;
        r[`${m.key}Density`] = pct(c, es.length);
        r[`${m.key}Share`] = pct(c, totals[m.key]);
      }
      return r;
    });
  }, [list, dim, y]);

  const sorted = [...rows].sort((a, b) => (typeof a[sortKey] === 'number' ? (b[sortKey] as number) - (a[sortKey] as number) : String(a[sortKey]).localeCompare(String(b[sortKey]))));
  const m = METRICS.find((x) => x.key === metric)!;

  const cats = useMemo(() => sortByRank(uniqueValues(list, 'talentCategory'), config.ranks.talentCategory), [list, config]);
  const stack = useMemo(() => {
    const g = groupBy(list, (e) => orgName(e, dim));
    return [...g.entries()].map(([name, es]) => {
      const r: Record<string, number | string> = { name, total: es.length };
      cats.forEach((c) => (r[c] = es.filter((e) => val(e, 'talentCategory') === c).length));
      return r;
    }).sort((a, b) => (b.total as number) - (a.total as number)).slice(0, 12);
  }, [list, dim, cats]);

  const th = (k: string, label: string) => (
    <th onClick={() => setSortKey(k)} className={cx('cursor-pointer whitespace-nowrap px-3 py-2 text-right font-medium hover:text-navy-900', sortKey === k && 'text-teal-700')}>{label}{sortKey === k ? ' ▼' : ''}</th>
  );

  return (
    <div>
      <PageHeader title="Organization Talent Analytics" subtitle="Talent density, distribution and concentration across the organization"
        actions={<Select value={dim} onChange={(v) => setDim(v as OrgDim)} options={ORG_DIMS.map((d) => ({ value: d.key, label: `By ${d.label}` }))} />} />
      <FilterBar />

      <div className="grid gap-5 xl:grid-cols-3">
        <Section title={`${m.label} density by ${dimLabel}`} subtitle={`% of headcount in each unit · ${y === 'current' ? 'current' : 'last'} year`}
          action={<Select value={metric} onChange={(v) => setMetric(v as Metric)} options={METRICS.map((x) => ({ value: x.key, label: x.label }))} />}>
          <BarList data={[...rows].filter((r) => (r.n as number) > 0).sort((a, b) => (b[`${metric}Density`] as number) - (a[`${metric}Density`] as number)).map((r) => ({ name: String(r.name), value: r[`${metric}Density`] as number }))}
            valueFmt={(v) => `${v.toFixed(1)}%`} onClick={(n) => openList({ title: `${m.label} · ${dimLabel}: ${n}`, employees: list.filter((e) => orgName(e, dim) === n && m.fn(e, y)) })} />
        </Section>
        <Section title={`${m.label} concentration`} subtitle={`Share of all ${m.label.toLowerCase()} located in each unit`}>
          <BarList color={C.navy} data={[...rows].filter((r) => (r[metric] as number) > 0).sort((a, b) => (b[metric] as number) - (a[metric] as number)).map((r) => ({ name: String(r.name), value: r[metric] as number }))}
            total={rows.reduce((s, r) => s + (r[metric] as number), 0)} onClick={(n) => openList({ title: `${m.label} · ${dimLabel}: ${n}`, employees: list.filter((e) => orgName(e, dim) === n && m.fn(e, y)) })} />
        </Section>
        <Section title="Headcount distribution" subtitle={`Employees by ${dimLabel}`}>
          <BarList color="#5B7BA6" data={[...rows].sort((a, b) => (b.n as number) - (a.n as number)).map((r) => ({ name: String(r.name), value: r.n as number }))} total={list.length}
            onClick={(n) => openList({ title: `${dimLabel}: ${n}`, employees: list.filter((e) => orgName(e, dim) === n) })} />
        </Section>
      </div>

      <Section title={`Talent Category distribution by ${dimLabel}`} subtitle="Top 12 units by headcount" className="mt-5">
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={stack} margin={{ left: 0, right: 10, top: 5 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="name" interval={0} height={56} tick={{ fontSize: 10 }} tickFormatter={(s: string) => (s.length > 16 ? s.slice(0, 15) + '…' : s)} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {cats.map((c, i) => <Bar key={c} dataKey={c} stackId="a" fill={c === NA ? '#CBD5E1' : PALETTE[i % PALETTE.length]} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title={`Talent scorecard by ${dimLabel}`} subtitle="Click a column header to sort, a row to drill down" className="mt-5">
        <div className="max-h-[520px] overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th onClick={() => setSortKey('name')} className="cursor-pointer px-3 py-2 text-left font-medium">{dimLabel}</th>
                {th('n', 'Headcount')}{th('talent', 'Talent')}{th('talentDensity', 'Talent density')}{th('talentShare', 'Talent share')}
                {th('calib', 'Calibrated')}{th('successor', 'Successors')}{th('successorDensity', 'Succ. coverage')}{th('low', 'Low perf.')}{th('gems', 'Hidden gems')}{th('riders', 'Free riders')}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((r) => (
                <tr key={String(r.name)} className="cursor-pointer hover:bg-teal-50/60" onClick={() => openList({ title: `${dimLabel}: ${r.name}`, employees: list.filter((e) => orgName(e, dim) === r.name) })}>
                  <td className="px-3 py-1.5 font-medium text-navy-900">{String(r.name)}</td>
                  <td className="px-3 text-right tabular-nums">{r.n}</td>
                  <td className="px-3 text-right tabular-nums">{r.talent}</td>
                  <td className="px-3 text-right tabular-nums">{(r.talentDensity as number).toFixed(1)}%</td>
                  <td className="px-3 text-right tabular-nums">{(r.talentShare as number).toFixed(1)}%</td>
                  <td className="px-3 text-right tabular-nums">{r.calib}</td>
                  <td className="px-3 text-right tabular-nums">{r.successor}</td>
                  <td className="px-3 text-right tabular-nums">{(r.successorDensity as number).toFixed(1)}%</td>
                  <td className="px-3 text-right tabular-nums">{r.low}</td>
                  <td className="px-3 text-right tabular-nums">{r.gems}</td>
                  <td className="px-3 text-right tabular-nums">{r.riders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
