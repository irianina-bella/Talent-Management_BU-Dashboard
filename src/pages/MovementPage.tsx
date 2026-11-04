import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, Minus, HelpCircle, Scale } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { EmployeeTable } from '../components/EmployeeTable';
import { Kpi, Section, PageHeader, Select, Note, Button, C, clickName } from '../components/ui';
import { ORG_DIMS, OrgDim, groupBy, orgName, fmtPct } from '../lib/analytics';
import { compareRank, Movement } from '../lib/config';
import { Employee } from '../lib/model';
import type { PageKey } from '../components/Layout';

type Cmp = 'talent' | 'calib' | 'nomination';
const CMPS: { value: Cmp; label: string }[] = [
  { value: 'talent', label: 'Talent: Last year → Current year' },
  { value: 'calib', label: 'Talent Calibration: Last year → Current year' },
  { value: 'nomination', label: 'Calibration change: Talent CY → Calib CY' },
];
const MOVES: Movement[] = ['Upgrade', 'Downgrade', 'Stable', 'Unranked', 'No data'];
const COLORS: Record<Movement, string> = { Upgrade: C.teal, Downgrade: C.red, Stable: C.navy, Unranked: C.amber, 'No data': '#CBD5E1' };

export default function MovementPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const { filtered: list, config, openList } = useApp();
  const [cmp, setCmp] = useState<Cmp>('talent');
  const [dim, setDim] = useState<OrgDim>('company');
  const [show, setShow] = useState<Movement>('Upgrade');

  const moveOf = useMemo(() => (e: Employee): Movement => {
    if (cmp === 'talent') return compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY);
    if (cmp === 'calib') return compareRank(config.ranks.calib, e.v.calibLY, e.v.calibCY);
    return compareRank(config.ranks.calib, e.v.talentCY, e.v.calibCY);
  }, [cmp, config]);

  const buckets = useMemo(() => {
    const b = Object.fromEntries(MOVES.map((m) => [m, [] as Employee[]])) as Record<Movement, Employee[]>;
    list.forEach((e) => b[moveOf(e)].push(e));
    return b;
  }, [list, moveOf]);

  const byDim = (d: OrgDim) => {
    const g = groupBy(list, (e) => orgName(e, d));
    return [...g.entries()].map(([name, es]) => {
      const r: Record<string, string | number> = { name, total: es.length };
      MOVES.forEach((m) => (r[m] = es.filter((e) => moveOf(e) === m).length));
      return r;
    }).sort((a, b) => (b.total as number) - (a.total as number)).slice(0, 12);
  };
  const companyData = useMemo(() => byDim('company'), [list, moveOf]);
  const dimData = useMemo(() => byDim(dim), [list, moveOf, dim]);
  const ranked = (cmp === 'talent' ? config.ranks.talent : config.ranks.calib).length > 0;
  const comparable = list.length - buckets['No data'].length;

  const chart = (data: Record<string, string | number>[], d: OrgDim) => (
    <div className="h-80">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 16 }}>
          <CartesianGrid horizontal={false} stroke={C.grid} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} tickFormatter={(s: string) => (s.length > 24 ? s.slice(0, 23) + '…' : s)} />
          <Tooltip />
          <Legend />
          {MOVES.map((m) => <Bar key={m} dataKey={m} stackId="a" fill={COLORS[m]} cursor="pointer"
            onClick={(x) => { const n = clickName(x); if (n) openList({ title: `${m} · ${n}`, employees: buckets[m].filter((e) => orgName(e, d) === n) }); }} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div>
      <PageHeader title="Talent Movement Analytics" subtitle="Upgrade, downgrade and stagnation based on the hierarchy configured in Mapping & Rules"
        actions={<Select value={cmp} onChange={(v) => setCmp(v as Cmp)} options={CMPS} />} />
      <FilterBar showYear={false} />
      {!ranked && <div className="mb-5"><Note>No hierarchy configured for this comparison — all changes appear as "Unranked". <Button variant="ghost" className="!py-0.5 text-xs" onClick={() => navigate('settings')}>Configure ranking</Button></Note></div>}
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Kpi label="Upgrade" value={buckets.Upgrade.length} sub={fmtPct(buckets.Upgrade.length, comparable)} icon={<ArrowUp size={18} />} tone="teal" onClick={() => setShow('Upgrade')} />
        <Kpi label="Downgrade" value={buckets.Downgrade.length} sub={fmtPct(buckets.Downgrade.length, comparable)} icon={<ArrowDown size={18} />} tone="red" onClick={() => setShow('Downgrade')} />
        <Kpi label="Stagnation (no change)" value={buckets.Stable.length} sub={fmtPct(buckets.Stable.length, comparable)} icon={<Minus size={18} />} onClick={() => setShow('Stable')} />
        <Kpi label="Unranked change" value={buckets.Unranked.length} sub="values not in hierarchy" icon={<HelpCircle size={18} />} tone="amber" onClick={() => setShow('Unranked')} />
        <Kpi label="Not comparable" value={buckets['No data'].length} sub="one or both years blank" icon={<Scale size={18} />} tone="slate" onClick={() => setShow('No data')} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Movement by company" subtitle="Top 12 companies by headcount — click a segment to drill down">{chart(companyData, 'company')}</Section>
        <Section title={`Movement by ${ORG_DIMS.find((d) => d.key === dim)!.label}`} subtitle="Top 12 units by headcount"
          action={<Select value={dim} onChange={(v) => setDim(v as OrgDim)} options={ORG_DIMS.filter((d) => d.key !== 'company').map((d) => ({ value: d.key, label: d.label }))} />}>
          {chart(dimData, dim)}
        </Section>
      </div>

      <Section title={`Employees · ${show}`} subtitle={CMPS.find((c) => c.value === cmp)!.label} className="mt-5"
        action={<Select value={show} onChange={(v) => setShow(v as Movement)} options={MOVES} />}>
        <EmployeeTable employees={buckets[show]} extraCols={[{ key: 'calibLY', label: 'Calib LY', flag: true }, { key: 'calibCY', label: 'Calib CY', flag: true }]} />
      </Section>
      <p className="mt-4 text-[11px] text-slate-400">Talent Category, Cluster and 12-Box are provided for the current year only in the source structure, so category-level year-on-year movement is measured through the Talent and Talent Calibration columns.</p>
    </div>
  );
}
