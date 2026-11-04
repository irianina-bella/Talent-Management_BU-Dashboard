import { useMemo, useState } from 'react';
import { UserCheck, Percent, Star, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { EmployeeTable } from '../components/EmployeeTable';
import { Kpi, Section, PageHeader, Select, BarList, C, clickName } from '../components/ui';
import { groupBy, val, fmtPct, isSuccessor, isTalent, isYes, countBy, pct } from '../lib/analytics';
import { FieldKey } from '../lib/fields';

const DIMS: { value: FieldKey; label: string }[] = [
  { value: 'companyName', label: 'Company' }, { value: 'businessUnit', label: 'Business Unit' }, { value: 'directorateName', label: 'Directorate' },
  { value: 'divisionName', label: 'Division' }, { value: 'positionName', label: 'Position' }, { value: 'cLevel', label: 'C-Level' }, { value: 'talent12Box', label: 'Talent Class 12 Box' },
];

export default function SuccessionPage() {
  const { filtered: list, filters, openList } = useApp();
  const [dim, setDim] = useState<FieldKey>('companyName');
  const succ = useMemo(() => list.filter((e) => isSuccessor(e.v.successor)), [list]);
  const succTalent = succ.filter((e) => isTalent(e, filters.year));
  const succRisk = succ.filter((e) => isYes(e.v.lowPerformer) || isYes(e.v.freeRider));

  const coverage = useMemo(() => {
    const g = groupBy(list, (e) => val(e, dim));
    return [...g.entries()].map(([name, es]) => {
      const s = es.filter((e) => isSuccessor(e.v.successor)).length;
      return { name, Successors: s, Others: es.length - s, total: es.length, coverage: pct(s, es.length) };
    }).sort((a, b) => b.Successors - a.Successors || b.total - a.total);
  }, [list, dim]);

  const byValue = useMemo(() => countBy(succ, (e) => e.v.successor), [succ]);
  const dimLabel = DIMS.find((d) => d.value === dim)!.label;
  const chartData = coverage.slice(0, 12);

  return (
    <div>
      <PageHeader title="Succession Analytics" subtitle='Successors are counted only where "Identified as Successor" is explicitly populated in the source file' />
      <FilterBar />
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Identified successors" value={succ.length} icon={<UserCheck size={18} />} tone="teal" onClick={() => openList({ title: 'Identified successors', employees: succ })} />
        <Kpi label="Successor coverage" value={fmtPct(succ.length, list.length)} sub="of employees in scope" icon={<Percent size={18} />} />
        <Kpi label="Successors who are talent" value={succTalent.length} sub={`${fmtPct(succTalent.length, succ.length)} of successors · ${filters.year === 'current' ? 'CY' : 'LY'}`} icon={<Star size={18} />} onClick={() => openList({ title: 'Successors flagged as talent', employees: succTalent })} />
        <Kpi label="Successor quality risk" value={succRisk.length} sub="Successor + Low Performer / Free Rider" icon={<AlertTriangle size={18} />} tone="amber" onClick={() => openList({ title: 'Successors flagged as low performer or free rider', employees: succRisk })} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Section title={`Succession coverage by ${dimLabel}`} subtitle="Successors vs other employees (top 12 groups)" className="xl:col-span-2"
          action={<Select value={dim} onChange={(v) => setDim(v as FieldKey)} options={DIMS} />}>
          <div className="h-80">
            <ResponsiveContainer>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid horizontal={false} stroke={C.grid} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} tickFormatter={(s: string) => (s.length > 26 ? s.slice(0, 25) + '…' : s)} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Successors" stackId="a" fill={C.teal} cursor="pointer" onClick={(d) => { const n = clickName(d); if (n) openList({ title: `Successors · ${dimLabel}: ${n}`, employees: succ.filter((e) => val(e, dim) === n) }); }} />
                <Bar dataKey="Others" stackId="a" fill="#CBD5E1" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Successor designation" subtitle='Values found in "Identified as Successor"'>
          <BarList data={byValue} total={succ.length} onClick={(v) => openList({ title: `Successor: ${v}`, employees: succ.filter((e) => e.v.successor === v) })} />
        </Section>
      </div>

      <Section title={`Coverage table by ${dimLabel}`} className="mt-5">
        <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">{dimLabel}</th><th className="px-3 text-right">Headcount</th><th className="px-3 text-right">Successors</th><th className="px-3 text-right">Coverage</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {coverage.map((r) => (
                <tr key={r.name} className="cursor-pointer hover:bg-teal-50/60" onClick={() => openList({ title: `${dimLabel}: ${r.name}`, employees: list.filter((e) => val(e, dim) === r.name) })}>
                  <td className="px-3 py-1.5 text-navy-900">{r.name}</td><td className="px-3 text-right tabular-nums">{r.total}</td><td className="px-3 text-right tabular-nums">{r.Successors}</td>
                  <td className="px-3 text-right"><div className="ml-auto flex w-36 items-center gap-2"><div className="h-1.5 flex-1 rounded bg-slate-100"><div className="h-1.5 rounded bg-teal-600" style={{ width: `${r.coverage}%` }} /></div><span className="w-11 tabular-nums">{r.coverage.toFixed(1)}%</span></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Successor list" className="mt-5">
        <EmployeeTable employees={succ} extraCols={[{ key: 'successor', label: 'Successor' }]} />
      </Section>
    </div>
  );
}
