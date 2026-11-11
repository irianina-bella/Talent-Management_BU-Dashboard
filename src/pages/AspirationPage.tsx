import { useMemo, useState } from 'react';
import { Target, Compass, MinusCircle, HelpCircle, FileSpreadsheet, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { CrossTabTable } from '../components/CrossTabTable';
import { Kpi, Section, PageHeader, BarList, Select, Note, Button, C, PALETTE, cx, clickName } from '../components/ui';
import type { TableCol } from '../components/EmployeeTable';
import { useFilterText } from '../components/ExportMenu';
import { analyse, categoryCounts, topTexts, coverageOf, COVERAGE, PATTERNS, PATTERN_HELP, simBucket, EmpAsp, Horizon, HORIZON_LABEL } from '../lib/aspiration';
import { crossTab, orgName, OrgDim, ORG_DIMS, fmtPct } from '../lib/analytics';
import { UNCLASSIFIED } from '../lib/config';
import { NA } from '../lib/model';
import type { PageKey } from '../components/Layout';

const ASP_COLUMNS: TableCol[] = [
  { key: 'employeeName', label: 'Employee Name' }, { key: 'personnelNumber', label: 'Personnel No.' }, { key: 'companyName', label: 'Company' },
  { key: 'businessUnit', label: 'Business Unit' }, { key: 'divisionName', label: 'Division' }, { key: 'departmentName', label: 'Department' },
  { key: 'positionName', label: 'Current Position' }, { key: 'shortTermAspiration', label: 'Short-Term Aspiration' }, { key: 'longTermAspiration', label: 'Long-Term Aspiration' },
];
const ORG_CHOICES = ORG_DIMS.filter((d) => ['company', 'bu', 'directorate', 'division', 'department'].includes(d.key));
type Tab = 'short' | 'long' | 'compare';

/** Employee-level aspiration table: original text next to the derived category. */
function AspTable({ rows, h }: { rows: EmpAsp[]; h: Horizon }) {
  const { openProfile } = useApp();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const size = 15;
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = rows.filter((r) => (h === 'short' ? r.short : r.long).length);
    return (t ? list.filter((r) => [r.e.v.employeeName, r.e.v.personnelNumber, r.e.v.positionName, h === 'short' ? r.e.v.shortTermAspiration : r.e.v.longTermAspiration].some((s) => s.toLowerCase().includes(t))) : list)
      .sort((a, b) => a.e.v.employeeName.localeCompare(b.e.v.employeeName));
  }, [rows, q, h]);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const p = Math.min(page, pages - 1);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name, ID, position or aspiration…" className="h-9 w-full rounded-lg border border-slate-300 pl-8 pr-3 text-sm focus:border-teal-500 focus:outline-none" />
        </div>
        <span className="text-xs text-slate-500">{filtered.length.toLocaleString()} employees with {HORIZON_LABEL[h].toLowerCase()} aspiration</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Current Position</th><th className="px-3 py-2">Original aspiration text (Excel)</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Function</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice(p * size, p * size + size).map((r) => {
              const ents = h === 'short' ? r.short : r.long;
              return (
                <tr key={r.e.id} className="cursor-pointer align-top hover:bg-teal-50/60" onClick={() => openProfile(r.e)}>
                  <td className="px-3 py-2"><div className="font-medium text-navy-900">{r.e.v.employeeName || NA}</div><div className="text-[11px] text-slate-400">{r.e.v.personnelNumber}</div></td>
                  <td className="max-w-[200px] px-3 py-2 text-slate-600">{r.e.v.positionName || NA}</td>
                  <td className="max-w-[320px] whitespace-pre-line px-3 py-2 text-slate-700">{h === 'short' ? r.e.v.shortTermAspiration : r.e.v.longTermAspiration}</td>
                  <td className="px-3 py-2">{ents.map((x, i) => <div key={i} className={cx('whitespace-nowrap', x.category === UNCLASSIFIED ? 'text-amber-700' : 'text-navy-900')}>{x.category}</div>)}</td>
                  <td className="px-3 py-2 text-slate-600">{ents.map((x, i) => <div key={i} className="whitespace-nowrap">{x.fn}</div>)}</td>
                </tr>
              );
            })}
            {!filtered.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No aspiration data in the current filter.</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-slate-600">
          <button className="rounded-md border border-slate-300 p-1 disabled:opacity-40" disabled={p === 0} onClick={() => setPage(p - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
          Page {p + 1} of {pages}
          <button className="rounded-md border border-slate-300 p-1 disabled:opacity-40" disabled={p >= pages - 1} onClick={() => setPage(p + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
}

function HorizonView({ rows, h, total }: { rows: EmpAsp[]; h: Horizon; total: number }) {
  const { config, openList } = useApp();
  const [dim, setDim] = useState<OrgDim>('company');
  const label = HORIZON_LABEL[h];
  const withAsp = rows.filter((r) => (h === 'short' ? r.short : r.long).length);
  const cats = useMemo(() => categoryCounts(rows, h), [rows, h]);
  const fns = useMemo(() => categoryCounts(rows, h, 'fn'), [rows, h]);
  const texts = useMemo(() => topTexts(rows, h), [rows, h]);
  const order = [...config.aspirationCategories.map((c) => c.name), UNCLASSIFIED];
  const catRows = order.filter((c) => cats.has(c)).map((c) => ({ name: c, value: cats.get(c)!.length }));
  const unclassified = cats.get(UNCLASSIFIED)?.length ?? 0;
  const emps = (rs: EmpAsp[]) => rs.map((r) => r.e);
  const open = (title: string, rs: EmpAsp[]) => openList({ title, subtitle: `${label} aspiration`, employees: emps(rs), columns: ASP_COLUMNS });

  const byOrg = useMemo(() => {
    const units = new Map<string, EmpAsp[]>();
    for (const r of withAsp) { const u = orgName(r.e, dim); if (!units.has(u)) units.set(u, []); units.get(u)!.push(r); }
    return [...units.entries()].map(([name, rs]) => {
      const row: Record<string, string | number> = { name, total: rs.length };
      for (const c of order) row[c] = rs.filter((r) => (h === 'short' ? r.short : r.long).some((x) => x.category === c)).length;
      return row;
    }).sort((a, b) => (b.total as number) - (a.total as number)).slice(0, 12);
  }, [withAsp, dim, h, config]);
  const usedCats = order.filter((c) => byOrg.some((r) => (r[c] as number) > 0));
  const dimLabel = ORG_DIMS.find((d) => d.key === dim)!.label;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label={`Employees with ${label.toLowerCase()} aspiration`} value={withAsp.length.toLocaleString()} sub={`${fmtPct(withAsp.length, total)} of employees in scope`} icon={<Target size={18} />} tone="teal" onClick={() => open(`${label} aspiration recorded`, withAsp)} />
        <Kpi label="No aspiration data" value={(total - withAsp.length).toLocaleString()} sub="blank, N/A, #N/A or “-”" icon={<MinusCircle size={18} />} tone="slate" onClick={() => open(`${label}: no aspiration data`, rows.filter((r) => !(h === 'short' ? r.short : r.long).length))} />
        <Kpi label="Distinct aspirations" value={texts.length.toLocaleString()} sub="unique entries after text normalisation" icon={<Compass size={18} />} />
        <Kpi label="Unclassified" value={unclassified.toLocaleString()} sub={`${fmtPct(unclassified, withAsp.length)} of employees with aspiration`} icon={<HelpCircle size={18} />} tone="amber" onClick={() => open(`${label}: ${UNCLASSIFIED}`, cats.get(UNCLASSIFIED) || [])} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Section title={`${label} aspiration categories`} subtitle="Employees per category · % of all employees in scope · an employee with several entries counts in each of their categories">
          <BarList data={catRows} total={total} onClick={(c) => open(`${label} · ${c}`, cats.get(c) || [])} />
        </Section>
        <Section title={`Most popular ${label.toLowerCase()} aspirations`} subtitle="Grouped by identical text (case/spacing ignored); original wording shown">
          <BarList data={texts.slice(0, 15).map((t) => ({ name: t.name, value: t.rows.length }))} total={total} max={15} color={C.navy}
            onClick={(name) => { const t = texts.find((x) => x.name === name); if (t) open(`${label}: "${t.name}"`, t.rows); }} />
        </Section>
        <Section title={`${label} functional interest`} subtitle="Functional area mentioned in the aspiration text (level categories ignored)">
          <BarList data={[...fns.entries()].map(([name, rs]) => ({ name, value: rs.length })).sort((a, b) => b.value - a.value)} total={total} color="#5B7BA6"
            onClick={(c) => open(`${label} function · ${c}`, fns.get(c) || [])} />
        </Section>
      </div>

      <Section title={`${label} aspiration distribution by ${dimLabel}`} subtitle="Employees with a recorded aspiration, top 12 units · click a segment to drill down"
        action={<Select value={dim} onChange={(v) => setDim(v as OrgDim)} options={ORG_CHOICES.map((d) => ({ value: d.key, label: d.label }))} />}>
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={byOrg} layout="vertical" margin={{ left: 10, right: 16 }}>
              <CartesianGrid horizontal={false} stroke={C.grid} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} tickFormatter={(s: string) => (s.length > 26 ? s.slice(0, 25) + '…' : s)} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {usedCats.map((c, i) => <Bar key={c} dataKey={c} stackId="a" fill={c === UNCLASSIFIED ? '#CBD5E1' : PALETTE[i % PALETTE.length]} cursor="pointer"
                onClick={(d) => { const u = clickName(d); if (u) open(`${label} · ${c} · ${dimLabel}: ${u}`, withAsp.filter((r) => orgName(r.e, dim) === u && (h === 'short' ? r.short : r.long).some((x) => x.category === c))); }} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title={`Employee ${label.toLowerCase()} aspirations`} subtitle="Original Excel text alongside the derived category · click a row for the full profile" png={false}>
        <AspTable rows={rows} h={h} />
      </Section>
    </div>
  );
}

function CompareView({ rows, total }: { rows: EmpAsp[]; total: number }) {
  const { config, openList } = useApp();
  const open = (title: string, rs: EmpAsp[]) => openList({ title, subtitle: 'Short-term vs long-term aspiration', employees: rs.map((r) => r.e), columns: ASP_COLUMNS });
  const coverage = COVERAGE.map((c) => ({ name: c, rows: rows.filter((r) => coverageOf(r) === c) }));
  const both = rows.filter((r) => r.pattern);
  const patterns = PATTERNS.map((p) => ({ name: p, rows: both.filter((r) => r.patterns.includes(p)) }));
  const sims = ['High overlap (≥ 60%)', 'Partial overlap (20–59%)', 'Low overlap (< 20%)', 'Not comparable'].map((b) => ({ name: b, rows: both.filter((r) => simBucket(r.similarity) === b) }));
  const order = [...config.aspirationCategories.map((c) => c.name), UNCLASSIFIED];
  const byId = useMemo(() => new Map(rows.map((r) => [r.e.id, r])), [rows]);
  const tab = useMemo(() => crossTab(both.map((r) => r.e), (e) => byId.get(e.id)!.short[0].category, (e) => byId.get(e.id)!.long[0].category, order, order), [both, byId, config]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {coverage.map((c, i) => (
          <Kpi key={c.name} label={c.name} value={c.rows.length.toLocaleString()} sub={`${fmtPct(c.rows.length, total)} of employees`} icon={<Users size={18} />} tone={(['teal', 'navy', 'navy', 'slate'] as const)[i]} onClick={() => open(c.name, c.rows)} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Section title="Career direction patterns" subtitle={`Employees with both aspirations (${both.length}) · one employee can show several patterns · analytical observations only`} className="xl:col-span-2">
          <BarList data={patterns.map((p) => ({ name: p.name, value: p.rows.length }))} total={both.length} onClick={(n) => { const p = patterns.find((x) => x.name === n); if (p) open(p.name, p.rows); }} />
          <ul className="mt-4 space-y-1 text-[11px] text-slate-500">{PATTERNS.map((p) => <li key={p}><b className="text-slate-700">{p}:</b> {PATTERN_HELP[p]}</li>)}</ul>
        </Section>
        <Section title="Text similarity (ST vs LT)" subtitle="Share of words in common between the two aspiration texts">
          <BarList data={sims.map((s) => ({ name: s.name, value: s.rows.length }))} total={both.length} color={C.navy} onClick={(n) => { const s = sims.find((x) => x.name === n); if (s) open(`Similarity: ${s.name}`, s.rows); }} />
        </Section>
      </div>
      <Section title="Short-term category → long-term category" subtitle="Primary (first) entry of each horizon · diagonal = same category · click a cell for the employees">
        <CrossTabTable tab={tab} rowTitle="Short-term" colTitle="Long-term" label="Aspiration" />
      </Section>
      <Note>Patterns are descriptive comparisons of the text employees wrote. They are not assessments of readiness, potential or suitability.</Note>
    </div>
  );
}

export default function AspirationPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const { filtered: list, mapping, config } = useApp();
  const filterText = useFilterText();
  const [tab, setTab] = useState<Tab>('short');
  const [confirmDetails, setConfirmDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => analyse(list, config.aspirationCategories), [list, config]);
  const total = list.length;
  const missingCols = [mapping?.shortTermAspiration == null && 'CONV-Short Term Aspiration', mapping?.longTermAspiration == null && 'CONV-Long Term Aspiration'].filter(Boolean) as string[];

  const exportXlsx = async (details: boolean) => {
    setBusy(true);
    try {
      const [{ exportWorkbook }, { buildAspirationWorkbook }] = await Promise.all([import('../lib/exporters'), import('../lib/aspirationExport')]);
      await exportWorkbook(buildAspirationWorkbook(rows, config.aspirationCategories, filterText, details), details ? 'employee-aspiration-details' : 'career-aspiration-analysis');
    } finally { setBusy(false); setConfirmDetails(false); }
  };

  return (
    <div>
      <PageHeader title="Career Aspiration Analytics" subtitle="Short-term (CONV-Short Term Aspiration) and long-term (CONV-Long Term Aspiration) career interests · original text preserved"
        actions={<>
          <Button variant="secondary" disabled={busy} onClick={() => exportXlsx(false)} title="Aggregated counts only"><FileSpreadsheet size={15} />Export analysis (Excel)</Button>
          {confirmDetails ? (
            <span className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
              Includes names and personnel numbers.
              <Button className="!px-2 !py-1 text-xs" disabled={busy} onClick={() => exportXlsx(true)}>Export</Button>
              <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => setConfirmDetails(false)}>Cancel</Button>
            </span>
          ) : <Button variant="secondary" onClick={() => setConfirmDetails(true)}><FileSpreadsheet size={15} />Employee details…</Button>}
        </>} />
      <FilterBar showYear={false} />
      {missingCols.length > 0 && (
        <div className="mb-5"><Note>
          Column not found: <b>{missingCols.join(', ')}</b>. If your file only has the original "Short Term" / "Long Term" columns, map them to the aspiration fields in{' '}
          <button className="font-semibold underline" onClick={() => navigate('settings')}>Mapping & Rules → Column mapping</button>.
        </Note></div>
      )}
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {([['short', 'A. Short-Term Aspiration'], ['long', 'B. Long-Term Aspiration'], ['compare', 'Short-Term vs Long-Term']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cx('rounded-lg border px-3 py-1.5 text-xs font-medium transition', tab === k ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-300 bg-white text-navy-900 hover:border-teal-500')}>{l}</button>
        ))}
        <button onClick={() => navigate('settings')} className="ml-auto text-xs font-medium text-teal-700 hover:underline">Edit aspiration categories →</button>
      </div>
      {tab === 'compare' ? <CompareView rows={rows} total={total} /> : <HorizonView key={tab} rows={rows} h={tab} total={total} />}
    </div>
  );
}

