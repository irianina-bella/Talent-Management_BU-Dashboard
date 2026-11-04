import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { Section, PageHeader, Select, BarList, C, PALETTE, cx, clickName } from '../components/ui';
import { countBy, groupBy, ORG_DIMS, OrgDim, orgName, pct, uniqueValues, val } from '../lib/analytics';
import { sortByRank } from '../lib/config';
import { NA } from '../lib/model';
import { FieldKey } from '../lib/fields';

const DIMS: { key: FieldKey; label: string; rank?: 'talent12Box' | 'talentCluster' | 'talentCategory' | 'talent' | 'calib' }[] = [
  { key: 'talentCategory', label: 'Talent Category', rank: 'talentCategory' },
  { key: 'talentCluster', label: 'Talent Cluster', rank: 'talentCluster' },
  { key: 'talent12Box', label: 'Talent Class 12 Box', rank: 'talent12Box' },
  { key: 'tlClassCalibration', label: 'TL Class Calibration' },
  { key: 'talentCY', label: 'Talent (Current year)', rank: 'talent' },
  { key: 'talentLY', label: 'Talent (Last year)', rank: 'talent' },
];

export default function DistributionPage() {
  const { filtered: list, config, openList } = useApp();
  const [field, setField] = useState<FieldKey>('talentCategory');
  const [org, setOrg] = useState<OrgDim>('company');
  const def = DIMS.find((d) => d.key === field)!;
  const order = def.rank ? config.ranks[def.rank] : [];
  const n = list.length;

  const counts = useMemo(() => {
    const c = countBy(list, (e) => val(e, field));
    return sortByRank(c.map((x) => x.name), order).map((name) => c.find((x) => x.name === name)!);
  }, [list, field, order]);

  const values = useMemo(() => sortByRank(uniqueValues(list, field), order), [list, field, order]);
  const byOrg = useMemo(() => {
    const g = groupBy(list, (e) => orgName(e, org));
    return [...g.entries()].map(([name, es]) => {
      const r: Record<string, string | number> = { name, total: es.length };
      values.forEach((v) => (r[v] = es.filter((e) => val(e, field) === v).length));
      return r;
    }).sort((a, b) => (b.total as number) - (a.total as number)).slice(0, 12);
  }, [list, org, field, values]);

  const lyVsCy = useMemo(() => {
    const ly = countBy(list, (e) => val(e, 'talentLY'));
    const cy = countBy(list, (e) => val(e, 'talentCY'));
    const names = sortByRank([...new Set([...ly, ...cy].map((x) => x.name))], config.ranks.talent);
    return names.map((name) => ({ name, 'Last year': ly.find((x) => x.name === name)?.value || 0, 'Current year': cy.find((x) => x.name === name)?.value || 0 }));
  }, [list, config]);

  const concentration = useMemo(() => {
    const top = counts.filter((c) => c.name !== NA)[0];
    if (!top) return [];
    const g = groupBy(list.filter((e) => val(e, field) === top.name), (e) => orgName(e, org));
    return [...g.entries()].map(([name, es]) => ({ name, value: es.length })).sort((a, b) => b.value - a.value);
  }, [list, counts, field, org]);
  const orgLabel = ORG_DIMS.find((d) => d.key === org)!.label;

  return (
    <div>
      <PageHeader title="Talent Distribution" subtitle="Distribution of every talent classification in the source file — counts, percentages and concentration"
        actions={<Select value={org} onChange={(v) => setOrg(v as OrgDim)} options={ORG_DIMS.map((d) => ({ value: d.key, label: `Compare by ${d.label}` }))} />} />
      <FilterBar />

      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {DIMS.map((d) => (
          <button key={d.key} role="tab" aria-selected={field === d.key} onClick={() => setField(d.key)}
            className={cx('rounded-lg border px-3 py-1.5 text-xs font-medium transition', field === d.key ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-300 bg-white text-navy-900 hover:border-teal-500')}>
            {d.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Section title={`${def.label} — employee count & %`} subtitle="Click a bar to see the employees">
          <BarList data={counts} total={n} max={20} onClick={(v) => openList({ title: `${def.label}: ${v}`, employees: list.filter((e) => val(e, field) === v) })} />
        </Section>
        <Section title={`${def.label} by ${orgLabel}`} subtitle="Top 12 units by headcount" className="xl:col-span-2">
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={byOrg} margin={{ left: 0, right: 10, top: 5 }}>
                <CartesianGrid vertical={false} stroke={C.grid} />
                <XAxis dataKey="name" interval={0} height={56} tick={{ fontSize: 10 }} tickFormatter={(s: string) => (s.length > 16 ? s.slice(0, 15) + '…' : s)} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                {values.map((v, i) => <Bar key={v} dataKey={v} stackId="a" fill={v === NA ? '#CBD5E1' : PALETTE[i % PALETTE.length]} cursor="pointer"
                  onClick={(d) => { const u = clickName(d); if (u) openList({ title: `${def.label}: ${v} · ${orgLabel}: ${u}`, employees: list.filter((e) => val(e, field) === v && orgName(e, org) === u) }); }} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Section title="Talent last year vs current year" subtitle='Values of "Talent (Last year)" and "Talent (Current year)"'>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={lyVsCy} margin={{ left: 0, right: 10, top: 5 }}>
                <CartesianGrid vertical={false} stroke={C.grid} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Last year" fill="#B8C4D6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Current year" fill={C.teal} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title={`Concentration of "${counts.find((c) => c.name !== NA)?.name ?? NA}"`} subtitle={`Where the largest ${def.label} group sits, by ${orgLabel} (share of that group)`}>
          <BarList color={C.navy} data={concentration} total={concentration.reduce((s, c) => s + c.value, 0)}
            onClick={(u) => { const top = counts.find((c) => c.name !== NA)?.name; openList({ title: `${def.label}: ${top} · ${orgLabel}: ${u}`, employees: list.filter((e) => val(e, field) === top && orgName(e, org) === u) }); }} />
        </Section>
      </div>

      <Section title={`${def.label} — percentage table`} className="mt-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Value</th><th className="px-3 text-right">Employees</th><th className="px-3 text-right">% of filtered</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {counts.map((c) => (
                <tr key={c.name} className="cursor-pointer hover:bg-teal-50/60" onClick={() => openList({ title: `${def.label}: ${c.name}`, employees: list.filter((e) => val(e, field) === c.name) })}>
                  <td className="px-3 py-1.5 text-navy-900">{c.name}</td><td className="px-3 text-right tabular-nums">{c.value}</td><td className="px-3 text-right tabular-nums">{pct(c.value, n).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
