import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { Kpi, Section, PageHeader, BarList, Select, Note, C, clickName } from '../components/ui';
import { countBy, groupBy, isSuccessor, isTalent, isYes, ORG_DIMS, OrgDim, orgName, fmtPct } from '../lib/analytics';
import { compareRank } from '../lib/config';
import { Employee } from '../lib/model';

const BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '< 1 yr', min: 0, max: 1 }, { label: '1–2 yrs', min: 1, max: 2 }, { label: '2–3 yrs', min: 2, max: 3 },
  { label: '3–5 yrs', min: 3, max: 5 }, { label: '5–10 yrs', min: 5, max: 10 }, { label: '10+ yrs', min: 10, max: Infinity },
];

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <input type="number" min={0} step={0.5} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} className="h-9 w-28 rounded-lg border border-slate-300 px-2 text-sm" />
    </label>
  );
}

export default function RiskPage() {
  const { filtered: list, config, filters, openList } = useApp();
  // Configurable thresholds — user-defined, not derived from the data.
  const [posYears, setPosYears] = useState(3);
  const [golYears, setGolYears] = useState(4);
  const [minHead, setMinHead] = useState(5);
  const [dim, setDim] = useState<OrgDim>('department');
  const y = filters.year;
  const open = (title: string, employees: Employee[]) => openList({ title, employees });

  const obs = useMemo(() => {
    const longPos = list.filter((e) => e.n.yrsInPos !== null && e.n.yrsInPos >= posYears);
    const longGol = list.filter((e) => e.n.yrsInGol !== null && e.n.yrsInGol >= golYears);
    const talentLongPos = longPos.filter((e) => isTalent(e, y));
    const stagnantTalent = list.filter((e) => isYes(e.v.talentLY) && isYes(e.v.talentCY) && e.n.yrsInPos !== null && e.n.yrsInPos >= posYears);
    const stableStatus = list.filter((e) => compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY) === 'Stable');
    const gemsNotSucc = list.filter((e) => isYes(e.v.hiddenGems) && !isSuccessor(e.v.successor));
    const gemsNotTalent = list.filter((e) => isYes(e.v.hiddenGems) && !isTalent(e, y));
    const lowSucc = list.filter((e) => isYes(e.v.lowPerformer) && isSuccessor(e.v.successor));
    const lowLongGol = list.filter((e) => isYes(e.v.lowPerformer) && e.n.yrsInGol !== null && e.n.yrsInGol >= golYears);
    const noTenure = list.filter((e) => e.n.yrsInPos === null);
    return { longPos, longGol, talentLongPos, stagnantTalent, stableStatus, gemsNotSucc, gemsNotTalent, lowSucc, lowLongGol, noTenure };
  }, [list, posYears, golYears, y, config]);

  const tenure = useMemo(() => BUCKETS.map((b) => ({
    name: b.label,
    'Years in position': list.filter((e) => e.n.yrsInPos !== null && e.n.yrsInPos >= b.min && e.n.yrsInPos < b.max).length,
    'Years in grade': list.filter((e) => e.n.yrsInGol !== null && e.n.yrsInGol >= b.min && e.n.yrsInGol < b.max).length,
  })), [list]);

  const lpCat = useMemo(() => countBy(list.filter((e) => e.v.lowPerformerCategory && !/^no$/i.test(e.v.lowPerformerCategory)), (e) => e.v.lowPerformerCategory), [list]);

  const gaps = useMemo(() => {
    const g = groupBy(list, (e) => orgName(e, dim));
    return [...g.entries()].filter(([, es]) => es.length >= minHead).map(([name, es]) => ({
      name, n: es.length, succ: es.filter((e) => isSuccessor(e.v.successor)).length, talent: es.filter((e) => isTalent(e, y)).length, es,
    })).filter((r) => r.succ === 0).sort((a, b) => b.n - a.n);
  }, [list, dim, minHead, y]);
  const dimLabel = ORG_DIMS.find((d) => d.key === dim)!.label;

  const tile = (label: string, es: Employee[], sub: string, tone: 'navy' | 'teal' | 'amber' | 'red' | 'slate' = 'navy') => (
    <Kpi label={label} value={es.length} sub={`${fmtPct(es.length, list.length)} · ${sub}`} tone={tone} onClick={() => open(label, es)} />
  );

  return (
    <div>
      <PageHeader title="Talent Risk Indicators" subtitle="Descriptive, data-based observations. No retention probability, flight-risk score or attrition prediction is calculated." />
      <FilterBar />
      <Section title="Configurable thresholds" subtitle="These thresholds are your assumptions, not values from the data. Adjust them to match your talent policy." png={false} className="mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <NumInput label="Long tenure in position (≥ years)" value={posYears} onChange={setPosYears} />
          <NumInput label="Long tenure in grade (≥ years)" value={golYears} onChange={setGolYears} />
          <NumInput label="Min. headcount for coverage gap" value={minHead} onChange={(n) => setMinHead(Math.round(n))} />
          <span className="text-xs text-slate-500">Tenure is parsed from "Yrs in Current Pos" / "Yrs in Current Gol" (e.g. "02 YEARS 06 MONTH" = 2.5). {obs.noTenure.length} employees have no tenure value (N/A).</span>
        </div>
      </Section>

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {tile(`In position ≥ ${posYears} yrs`, obs.longPos, 'tenure in position', 'slate')}
        {tile(`In grade ≥ ${golYears} yrs`, obs.longGol, 'tenure in grade', 'slate')}
        {tile(`Talent in position ≥ ${posYears} yrs`, obs.talentLongPos, 'talent with long tenure', 'amber')}
        {tile('Talent status unchanged + long tenure', obs.stagnantTalent, 'talent both years, long in role', 'amber')}
        {tile('Talent status stagnation', obs.stableStatus, 'same talent flag LY & CY')}
        {tile('Hidden gems not successors', obs.gemsNotSucc, 'untapped potential', 'teal')}
        {tile('Hidden gems not talent', obs.gemsNotTalent, `not flagged talent (${y === 'current' ? 'CY' : 'LY'})`, 'teal')}
        {tile('Low performers identified as successors', obs.lowSucc, 'succession quality', 'red')}
        {tile(`Low performers in grade ≥ ${golYears} yrs`, obs.lowLongGol, 'long tenure & low performance', 'red')}
        <Kpi label={`${dimLabel}s without successors`} value={gaps.length} sub={`units with ≥ ${minHead} employees`} tone="red" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Tenure distribution" subtitle="Years in current position and current grade">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={tenure} margin={{ left: 0, right: 10, top: 5 }}>
                <CartesianGrid vertical={false} stroke={C.grid} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Years in position" fill={C.navy} radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(d) => { const b = BUCKETS.find((x) => x.label === clickName(d)); if (b) open(`Years in position: ${b.label}`, list.filter((e) => e.n.yrsInPos !== null && e.n.yrsInPos >= b.min && e.n.yrsInPos < b.max)); }} />
                <Bar dataKey="Years in grade" fill={C.teal} radius={[3, 3, 0, 0]} cursor="pointer"
                  onClick={(d) => { const b = BUCKETS.find((x) => x.label === clickName(d)); if (b) open(`Years in grade: ${b.label}`, list.filter((e) => e.n.yrsInGol !== null && e.n.yrsInGol >= b.min && e.n.yrsInGol < b.max)); }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Low Performer Category" subtitle='Values in "Low Performer Category" (excluding "No")'>
          <BarList data={lpCat} total={list.length} color={C.red} onClick={(v) => open(`Low Performer Category: ${v}`, list.filter((e) => e.v.lowPerformerCategory === v))} />
          {!lpCat.length && <p className="mt-2 text-xs text-slate-400">No low performer category recorded in the filtered data.</p>}
        </Section>
      </div>

      <Section title={`Successor coverage gaps by ${dimLabel}`} subtitle={`Units with at least ${minHead} employees and no identified successor`} className="mt-5"
        action={<Select value={dim} onChange={(v) => setDim(v as OrgDim)} options={ORG_DIMS.map((d) => ({ value: d.key, label: d.label }))} />}>
        {gaps.length ? (
          <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">{dimLabel}</th><th className="px-3 text-right">Headcount</th><th className="px-3 text-right">Talent</th><th className="px-3 text-right">Successors</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {gaps.map((g) => (
                  <tr key={g.name} className="cursor-pointer hover:bg-teal-50/60" onClick={() => open(`${dimLabel}: ${g.name}`, g.es)}>
                    <td className="px-3 py-1.5 text-navy-900">{g.name}</td><td className="px-3 text-right tabular-nums">{g.n}</td><td className="px-3 text-right tabular-nums">{g.talent}</td><td className="px-3 text-right tabular-nums text-red-700">0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="py-4 text-center text-sm text-slate-400">No coverage gaps at the current threshold.</p>}
      </Section>
      <div className="mt-4"><Note>All indicators are counts of employees matching explicit field values and the thresholds above. They describe the data; they do not classify employees as at-risk or predict attrition.</Note></div>
    </div>
  );
}
