import { useMemo } from 'react';
import { Users, Star, UserCheck, Gem, ShieldAlert, TrendingDown, Scale, ArrowUpDown, Repeat } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { Kpi, Section, PageHeader, BarList, PALETTE, C, clickName } from '../components/ui';
import { countBy, fmtPct, isTalent, isCalibTalent, isSuccessor, isYes, val, talentFlag, calibFlag, groupBy, pct } from '../lib/analytics';
import { compareRank, sortByRank } from '../lib/config';
import { NA } from '../lib/model';
import type { PageKey } from '../components/Layout';

export default function OverviewPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const { filtered: list, filters, config, openList } = useApp();
  const y = filters.year;
  const yl = y === 'current' ? 'Current Year' : 'Last Year';

  const m = useMemo(() => {
    const talent = list.filter((e) => isTalent(e, y));
    const calib = list.filter((e) => isCalibTalent(e, y));
    const succ = list.filter((e) => isSuccessor(e.v.successor));
    const gems = list.filter((e) => isYes(e.v.hiddenGems));
    const riders = list.filter((e) => isYes(e.v.freeRider));
    const lows = list.filter((e) => isYes(e.v.lowPerformer));
    const calChanged = list.filter((e) => talentFlag(e, y) && calibFlag(e, y) && talentFlag(e, y).toLowerCase() !== calibFlag(e, y).toLowerCase());
    const up = list.filter((e) => compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY) === 'Upgrade');
    const down = list.filter((e) => compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY) === 'Downgrade');
    const lyTalent = list.filter((e) => isTalent(e, 'last'));
    const retained = lyTalent.filter((e) => isTalent(e, 'current'));
    const lost = lyTalent.filter((e) => e.v.talentCY && !isTalent(e, 'current'));
    return { talent, calib, succ, gems, riders, lows, calChanged, up, down, lyTalent, retained, lost };
  }, [list, y, config]);

  const cat = useMemo(() => {
    const rows = countBy(list, (e) => val(e, 'talentCategory'));
    const order = sortByRank(rows.map((r) => r.name), config.ranks.talentCategory);
    return order.map((n) => rows.find((r) => r.name === n)!);
  }, [list, config]);
  const box = useMemo(() => countBy(list, (e) => val(e, 'talent12Box')), [list]);
  const cluster = useMemo(() => countBy(list, (e) => val(e, 'talentCluster')), [list]);
  const byCompany = useMemo(() => {
    const g = groupBy(list, (e) => val(e, 'companyName'));
    return [...g.entries()].map(([name, es]) => ({
      name, Talent: es.filter((e) => isTalent(e, y)).length, 'Non-talent': es.filter((e) => talentFlag(e, y) && !isTalent(e, y)).length,
      'N/A': es.filter((e) => !talentFlag(e, y)).length, total: es.length,
    })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [list, y]);

  const open = (title: string, employees: typeof list) => openList({ title, employees });
  const n = list.length;

  const topBox = box[0];
  const summary = [
    `${n.toLocaleString()} employees in scope; ${m.talent.length.toLocaleString()} (${fmtPct(m.talent.length, n)}) are flagged as talent for the ${yl.toLowerCase()} and ${m.calib.length.toLocaleString()} (${fmtPct(m.calib.length, n)}) are confirmed after calibration.`,
    `Successor coverage stands at ${fmtPct(m.succ.length, n)} (${m.succ.length} employees explicitly identified as successors in the source data).`,
    topBox ? `The largest 12-Box class is "${topBox.name}" with ${topBox.value} employees (${fmtPct(topBox.value, n)}).` : '',
    m.lyTalent.length ? `Of ${m.lyTalent.length} last-year talents, ${m.retained.length} retained talent status (${fmtPct(m.retained.length, m.lyTalent.length)}) and ${m.lost.length} were not re-identified.` : 'No employees were flagged as talent last year in the current scope.',
    `${m.lows.length} low performers, ${m.riders.length} free riders and ${m.gems.length} hidden gems are flagged.`,
  ].filter(Boolean);

  return (
    <div>
      <PageHeader title="Executive Overview" subtitle={`Talent health across the organization · ${yl} view · all figures computed from the uploaded dataset`} />
      <FilterBar />

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Total Employees" value={n.toLocaleString()} icon={<Users size={18} />} onClick={() => navigate('employees')} />
        <Kpi label={`Total Talent (${yl})`} value={m.talent.length.toLocaleString()} sub={`${fmtPct(m.talent.length, n)} of workforce`} icon={<Star size={18} />} tone="teal" onClick={() => open(`Talent (${yl})`, m.talent)} />
        <Kpi label="Successor Coverage" value={fmtPct(m.succ.length, n)} sub={`${m.succ.length} identified successors`} icon={<UserCheck size={18} />} tone="teal" onClick={() => open('Identified successors', m.succ)} />
        <Kpi label="Hidden Gems" value={m.gems.length} sub={fmtPct(m.gems.length, n)} icon={<Gem size={18} />} onClick={() => open('Hidden Gems', m.gems)} />
        <Kpi label="Free Riders" value={m.riders.length} sub={fmtPct(m.riders.length, n)} icon={<ShieldAlert size={18} />} tone="amber" onClick={() => open('Free Riders', m.riders)} />
        <Kpi label="Low Performers" value={m.lows.length} sub={fmtPct(m.lows.length, n)} icon={<TrendingDown size={18} />} tone="red" onClick={() => open('Low Performers', m.lows)} />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label={`Calibrated Talent (${yl})`} value={m.calib.length} sub={fmtPct(m.calib.length, n)} icon={<Scale size={18} />} onClick={() => open(`Calibrated talent (${yl})`, m.calib)} />
        <Kpi label="Calibration Changes" value={m.calChanged.length} sub="Talent ≠ Calibrated result" icon={<Scale size={18} />} tone="slate" onClick={() => open('Calibration changed the talent result', m.calChanged)} />
        <Kpi label="Talent Upgrades" value={m.up.length} sub="Talent LY → CY" icon={<ArrowUpDown size={18} />} tone="teal" onClick={() => open('Talent upgrades (LY → CY)', m.up)} />
        <Kpi label="Talent Downgrades" value={m.down.length} sub="Talent LY → CY" icon={<ArrowUpDown size={18} />} tone="amber" onClick={() => open('Talent downgrades (LY → CY)', m.down)} />
        <Kpi label="Talent Retention" value={fmtPct(m.retained.length, m.lyTalent.length)} sub={`${m.retained.length} of ${m.lyTalent.length} LY talents retained`} icon={<Repeat size={18} />} onClick={() => open('Talent retained (Yes LY and CY)', m.retained)} />
        <Kpi label="Talent Retention Risk" value={m.lost.length} sub="LY talent not re-identified" icon={<Repeat size={18} />} tone="red" onClick={() => open('Retention risk: LY talent not re-identified in CY', m.lost)} />
      </div>

      <Section title="Executive summary" className="mb-5">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
        <p className="mt-3 text-[11px] text-slate-400">"Retention risk" refers to talent-status retention between years. The source has no attrition or flight-risk column, so no turnover risk is inferred.</p>
      </Section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Talent Category distribution" subtitle="Click a segment to drill down">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={cat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={1} onClick={(d) => { const c = clickName(d); if (c) open(`Talent Category: ${c}`, list.filter((e) => val(e, 'talentCategory') === c)); }} className="cursor-pointer">
                  {cat.map((c, i) => <Cell key={c.name} fill={c.name === NA ? '#CBD5E1' : PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v} (${pct(Number(v), n).toFixed(1)}%)`, 'Employees']} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Talent Class 12 Box" subtitle="Distribution by classification in the source data">
          <BarList data={box} total={n} onClick={(name) => open(`12 Box: ${name}`, list.filter((e) => val(e, 'talent12Box') === name))} />
        </Section>
        <Section title="Talent Cluster" subtitle="Distribution by cluster">
          <BarList data={cluster} total={n} color={C.navy} onClick={(name) => open(`Cluster: ${name}`, list.filter((e) => val(e, 'talentCluster') === name))} />
        </Section>
      </div>

      <Section title={`Talent by company (${yl})`} subtitle="Top 10 companies by headcount" className="mt-5">
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={byCompany} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis dataKey="name" interval={0} tick={{ fontSize: 10 }} height={50} tickFormatter={(s: string) => (s.length > 18 ? s.slice(0, 17) + '…' : s)} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Talent" stackId="a" fill={C.teal} />
              <Bar dataKey="Non-talent" stackId="a" fill={C.navy} />
              <Bar dataKey="N/A" stackId="a" fill="#CBD5E1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>
    </div>
  );
}
