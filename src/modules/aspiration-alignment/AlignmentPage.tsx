import { useMemo, useState } from 'react';
import { Users, CheckCircle2, TrendingUp, Minus, TrendingDown, AlertTriangle, Search, ChevronLeft, ChevronRight, FileSpreadsheet, Lock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend } from 'recharts';
import { useApp } from '../../state/AppState';
import { FilterBar } from '../../components/FilterBar';
import { useFilterText } from '../../components/ExportMenu';
import { Kpi, Section, PageHeader, Select, Button, Note, C, cx, clickName } from '../../components/ui';
import { ORG_DIMS, OrgDim, orgName } from '../../lib/analytics';
import type { Employee } from '../../lib/model';
import { ALIGNMENT_CLASSES, calculateAspirationAlignment, pctOf, summarize, type AlignmentRow } from '../../analytics/aspirationAlignment';
import { APPROVED_CATEGORIES } from '../../analytics/aspirationCategoryMapping';
import type { AlignmentStatus, CategoryPoint } from '../../types/aspirationAlignment';
import { STATUS_STYLE, useAlignmentRows } from './common';
import { StatusBadge } from './StatusBadge';
import { AlignmentCardModal } from './AlignmentCard';
import type { PageKey } from '../../components/Layout';

type Row = AlignmentRow<Employee>;
const NA = 'N/A';
const ORG_CHOICES = ORG_DIMS.filter((d) => ['company', 'bu', 'directorate', 'division', 'department'].includes(d.key));
const LEVELS: { label: 'High' | 'Medium' | 'Low'; point: CategoryPoint }[] = [{ label: 'High', point: 3 }, { label: 'Medium', point: 2 }, { label: 'Low', point: 1 }];

type ColKey = 'pn' | 'name' | 'co' | 'bu' | 'dir' | 'div' | 'dept' | 'pos' | 'st' | 'stc' | 'stp' | 'lt' | 'ltc' | 'ltp' | 'stw' | 'ltw' | 'score' | 'cls';
const COLS: { k: ColKey; label: string; get: (r: Row) => string | number | null; num?: boolean }[] = [
  { k: 'pn', label: 'Personnel No.', get: (r) => r.e.v.personnelNumber },
  { k: 'name', label: 'Employee Name', get: (r) => r.e.v.employeeName },
  { k: 'co', label: 'Company', get: (r) => r.e.v.companyName },
  { k: 'bu', label: 'Business Unit', get: (r) => r.e.v.businessUnit },
  { k: 'dir', label: 'Directorate', get: (r) => r.e.v.directorateName },
  { k: 'div', label: 'Division', get: (r) => r.e.v.divisionName },
  { k: 'dept', label: 'Department', get: (r) => r.e.v.departmentName },
  { k: 'pos', label: 'Position', get: (r) => r.e.v.positionName },
  { k: 'st', label: 'Short-Term Aspiration', get: (r) => r.a.shortTerm.original },
  { k: 'stc', label: 'ST Class.', get: (r) => r.a.shortTerm.category?.classification ?? null },
  { k: 'stp', label: 'ST Point', get: (r) => r.a.shortTerm.category?.point ?? null, num: true },
  { k: 'lt', label: 'Long-Term Aspiration', get: (r) => r.a.longTerm.original },
  { k: 'ltc', label: 'LT Class.', get: (r) => r.a.longTerm.category?.classification ?? null },
  { k: 'ltp', label: 'LT Point', get: (r) => r.a.longTerm.category?.point ?? null, num: true },
  { k: 'stw', label: 'ST Weighted (×70%)', get: (r) => r.a.result?.shortTermWeightedPoint ?? null, num: true },
  { k: 'ltw', label: 'LT Weighted (×30%)', get: (r) => r.a.result?.longTermWeightedPoint ?? null, num: true },
  { k: 'score', label: 'Alignment Score', get: (r) => r.a.result?.rawAlignmentScore ?? null, num: true },
  { k: 'cls', label: 'Alignment Classification', get: (r) => r.a.status },
];

function cellText(c: (typeof COLS)[number], r: Row) {
  const v = c.get(r);
  if (v === null || v === '') return NA;
  if (c.k === 'score') return r.a.result!.displayAlignmentScore;
  if (c.k === 'stw' || c.k === 'ltw') return (v as number).toFixed(2);
  return String(v);
}

function ResultTable({ rows, onOpen }: { rows: Row[]; onOpen: (r: Row) => void }) {
  const [q, setQ] = useState('');
  const [cls, setCls] = useState('');
  const [sort, setSort] = useState<{ k: ColKey; dir: 1 | -1 }>({ k: 'score', dir: -1 });
  const [page, setPage] = useState(0);
  const size = 20;
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    let l = rows;
    if (cls) l = l.filter((r) => r.a.status === cls);
    if (t) l = l.filter((r) => [r.e.v.employeeName, r.e.v.personnelNumber, r.e.v.positionName, r.e.v.companyName, r.e.v.departmentName, r.a.shortTerm.original, r.a.longTerm.original].some((s) => s.toLowerCase().includes(t)));
    const col = COLS.find((c) => c.k === sort.k)!;
    return [...l].sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      if (x === null || x === '') return 1; if (y === null || y === '') return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * sort.dir;
    });
  }, [rows, q, cls, sort]);
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(page, pages - 1);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative w-72">
            <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name, ID, position, unit, aspiration…" className="h-9 w-full rounded-lg border border-slate-300 pl-8 pr-3 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
          <Select value={cls} onChange={(v) => { setCls(v); setPage(0); }} allLabel="All classifications" options={Object.keys(STATUS_STYLE)} />
        </div>
        <span className="text-xs text-slate-500">{list.length.toLocaleString()} employees</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>{COLS.map((c) => (
              <th key={c.k} onClick={() => setSort({ k: c.k, dir: sort.k === c.k ? (sort.dir === 1 ? -1 : 1) : c.num ? -1 : 1 })}
                className={cx('cursor-pointer whitespace-nowrap px-2.5 py-2 font-medium hover:text-navy-900', c.num && 'text-right')}>{c.label}{sort.k === c.k ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.slice(p * size, p * size + size).map((r) => (
              <tr key={r.e.id} className="cursor-pointer hover:bg-teal-50/60" onClick={() => onOpen(r)}>
                {COLS.map((c) => {
                  const t = cellText(c, r);
                  return (
                    <td key={c.k} className={cx('px-2.5 py-1.5', c.num ? 'text-right tabular-nums' : 'whitespace-nowrap', c.k === 'name' && 'font-medium text-navy-900', ['st', 'lt', 'pos'].includes(c.k) && 'max-w-[200px] truncate', t === NA && 'text-slate-400')} title={t}>
                      {c.k === 'cls' ? <StatusBadge status={r.a.status} /> : c.k === 'score' && r.a.result ? <b>{t}</b> : t}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!list.length && <tr><td colSpan={COLS.length} className="px-3 py-8 text-center text-slate-400">No employees match.</td></tr>}
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

function ClassBars({ data, denom, onClick }: { data: { name: AlignmentStatus; value: number }[]; denom: number; onClick: (s: AlignmentStatus) => void }) {
  const top = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <button key={d.name} onClick={() => onClick(d.name)} className="group block w-full text-left">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-semibold" style={{ color: STATUS_STYLE[d.name].fg }}>{d.name}</span>
            <span className="tabular-nums text-slate-500"><b className="text-navy-900">{d.value}</b> · {pctOf(d.value, denom)}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full group-hover:opacity-80" style={{ width: `${(d.value / top) * 100}%`, background: STATUS_STYLE[d.name].solid }} /></div>
        </button>
      ))}
    </div>
  );
}

export default function AlignmentPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const rows = useAlignmentRows();
  const { openList, mapping } = useApp();
  const filterText = useFilterText();
  const [dim, setDim] = useState<OrgDim>('company');
  const [card, setCard] = useState<Row | null>(null);
  const [pendingExport, setPendingExport] = useState<null | 'employees' | 'unmapped' | 'incomplete'>(null);
  const [busy, setBusy] = useState(false);
  const s = useMemo(() => summarize(rows), [rows]);
  const scoredRows = rows.filter((r) => r.a.result);
  const open = (title: string, rs: Row[], subtitle?: string) => openList({ title, subtitle, employees: rs.map((r) => r.e), columns: [
    { key: 'employeeName', label: 'Employee Name' }, { key: 'personnelNumber', label: 'Personnel No.' }, { key: 'companyName', label: 'Company' }, { key: 'departmentName', label: 'Department' },
    { key: 'positionName', label: 'Position' }, { key: 'shortTermAspiration', label: 'Short-Term Aspiration' }, { key: 'longTermAspiration', label: 'Long-Term Aspiration' },
  ], trailing: 'alignment' });
  const byStatus = (st: AlignmentStatus) => rows.filter((r) => r.a.status === st);

  const sideDist = (side: 'shortTerm' | 'longTerm') => [
    ...APPROVED_CATEGORIES.map((c) => ({ name: c.name, cat: c, rows: rows.filter((r) => r.a[side].category?.no === c.no) })),
    { name: 'Unmapped', cat: null, rows: rows.filter((r) => r.a[side].status === 'unmapped') },
    { name: 'Missing (blank / N/A)', cat: null, rows: rows.filter((r) => r.a[side].status === 'missing') },
  ];

  const scoreDist = useMemo(() => {
    const combos = LEVELS.flatMap((st) => LEVELS.map((lt) => ({ st, lt, r: calculateAspirationAlignment(st.point, lt.point) })));
    const uniq = new Map<string, { score: string; raw: number; cls: AlignmentStatus }>();
    combos.forEach((c) => uniq.set(c.r.displayAlignmentScore, { score: c.r.displayAlignmentScore, raw: c.r.rawAlignmentScore, cls: c.r.alignmentClassification }));
    return [...uniq.values()].sort((a, b) => a.raw - b.raw).map((u) => ({ ...u, name: u.score, Employees: scoredRows.filter((r) => r.a.result!.displayAlignmentScore === u.score).length }));
  }, [scoredRows]);

  const orgData = useMemo(() => {
    const g = new Map<string, Row[]>();
    for (const r of rows) { const k = orgName(r.e, dim); if (!g.has(k)) g.set(k, []); g.get(k)!.push(r); }
    return [...g.entries()].map(([name, rs]) => {
      const x = summarize(rs);
      return { name, rs, x, HIGH: x.byClass['HIGH ALIGNMENT'], MEDIUM: x.byClass['MEDIUM ALIGNMENT'], LOW: x.byClass['LOW ALIGNMENT'] };
    }).sort((a, b) => b.x.total - a.x.total);
  }, [rows, dim]);
  const dimLabel = ORG_DIMS.find((d) => d.key === dim)!.label;

  const unmappedValues = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows) for (const side of ['shortTerm', 'longTerm'] as const) if (r.a[side].status === 'unmapped') {
      const k = `${side === 'shortTerm' ? 'ST' : 'LT'}|${r.a[side].original}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return [...m.entries()].map(([k, rs]) => ({ side: k.split('|')[0], value: k.slice(3), rs })).sort((a, b) => b.rs.length - a.rs.length);
  }, [rows]);

  const runExport = async (kind: 'summary' | 'employees' | 'unmapped' | 'incomplete') => {
    setBusy(true);
    try {
      const [{ exportWorkbook }, ex] = await Promise.all([import('../../lib/exporters'), import('./alignmentExport')]);
      if (kind === 'summary') await exportWorkbook([{ name: 'Alignment Summary', rows: ex.summaryRows(rows, filterText) }, { name: 'Unmapped Values', rows: ex.unmappedValueRows(rows) }], 'aspiration-alignment-summary');
      if (kind === 'employees') await exportWorkbook([{ name: 'Employee Alignment', rows: ex.employeeRows(rows) }], 'aspiration-alignment-employees');
      if (kind === 'unmapped') await exportWorkbook([{ name: 'Unmapped Values', rows: ex.unmappedValueRows(rows) }, { name: 'Unmapped Employees', rows: ex.employeeRows(byStatus('UNMAPPED CATEGORY')) }], 'aspiration-alignment-unmapped');
      if (kind === 'incomplete') await exportWorkbook([{ name: 'Incomplete Data', rows: ex.employeeRows(rows.filter((r) => r.a.status === 'INCOMPLETE DATA' || r.a.status === 'NO ASPIRATION DATA')) }], 'aspiration-alignment-incomplete');
    } finally { setBusy(false); setPendingExport(null); }
  };

  const missingCols = [mapping?.shortTermAspiration == null && 'CONV-Short Term Aspiration (AT)', mapping?.longTermAspiration == null && 'CONV-Long Term Aspiration (AV)'].filter(Boolean) as string[];
  const exportLabels = { employees: 'Employee results', unmapped: 'Unmapped records', incomplete: 'Incomplete records' } as const;

  return (
    <div>
      <PageHeader title="Employee Aspiration Alignment" subtitle="Approved 70:30 model · Score = ((Short-Term point × 70%) + (Long-Term point × 30%)) / 3 × 100% · HIGH ≥ 80% · MEDIUM ≥ 55% · LOW < 55%"
        actions={<>
          <Button variant="secondary" disabled={busy} onClick={() => runExport('summary')} title="Aggregated counts only"><FileSpreadsheet size={15} />Summary (Excel)</Button>
          {pendingExport ? (
            <span className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
              {exportLabels[pendingExport]} include names & personnel numbers ({filterText ? 'current filter' : 'all employees'}).
              <Button className="!px-2 !py-1 text-xs" disabled={busy} onClick={() => runExport(pendingExport)}>Export</Button>
              <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => setPendingExport(null)}>Cancel</Button>
            </span>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setPendingExport('employees')}><FileSpreadsheet size={15} />Employee results…</Button>
              <Button variant="secondary" onClick={() => setPendingExport('unmapped')}>Unmapped…</Button>
              <Button variant="secondary" onClick={() => setPendingExport('incomplete')}>Incomplete…</Button>
            </>
          )}
        </>} />
      <FilterBar showYear={false} />
      {missingCols.length > 0 && <div className="mb-5"><Note>Column not found: <b>{missingCols.join(', ')}</b>. Map it in <button className="font-semibold underline" onClick={() => navigate('settings')}>Mapping & Rules → Column mapping</button>.</Note></div>}

      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Total Employees" value={s.total.toLocaleString()} sub="total population (current filter)" icon={<Users size={18} />} />
        <Kpi label="Complete Aspiration Data" value={s.scored.toLocaleString()} sub={`${pctOf(s.scored, s.total)} of total · scored population`} icon={<CheckCircle2 size={18} />} tone="teal" onClick={() => open('Scored population', scoredRows)} />
        <Kpi label="HIGH ALIGNMENT" value={s.byClass['HIGH ALIGNMENT']} sub={`${pctOf(s.byClass['HIGH ALIGNMENT'], s.scored)} of scored`} icon={<TrendingUp size={18} />} tone="teal" onClick={() => open('HIGH ALIGNMENT', byStatus('HIGH ALIGNMENT'))} />
        <Kpi label="MEDIUM ALIGNMENT" value={s.byClass['MEDIUM ALIGNMENT']} sub={`${pctOf(s.byClass['MEDIUM ALIGNMENT'], s.scored)} of scored`} icon={<Minus size={18} />} tone="amber" onClick={() => open('MEDIUM ALIGNMENT', byStatus('MEDIUM ALIGNMENT'))} />
        <Kpi label="LOW ALIGNMENT" value={s.byClass['LOW ALIGNMENT']} sub={`${pctOf(s.byClass['LOW ALIGNMENT'], s.scored)} of scored`} icon={<TrendingDown size={18} />} tone="red" onClick={() => open('LOW ALIGNMENT', byStatus('LOW ALIGNMENT'))} />
        <Kpi label="Incomplete / Unmapped" value={s.incomplete + s.unmapped + s.noData} sub={`${pctOf(s.incomplete + s.unmapped + s.noData, s.total)} of total · ${s.incomplete} incomplete · ${s.unmapped} unmapped · ${s.noData} no data`} icon={<AlertTriangle size={18} />} tone="slate"
          onClick={() => open('Incomplete / unmapped / no data', rows.filter((r) => !r.a.result))} />
      </div>

      <Section title="Data coverage" subtitle={`Denominator: total population (${s.total.toLocaleString()} employees in the current filter)`} className="mb-5">
        <div className="flex h-8 w-full overflow-hidden rounded-md">
          {([['Scored population', s.scored, '#0F9490', scoredRows], ['Incomplete data', s.incomplete, STATUS_STYLE['INCOMPLETE DATA'].solid, byStatus('INCOMPLETE DATA')], ['Unmapped category', s.unmapped, STATUS_STYLE['UNMAPPED CATEGORY'].solid, byStatus('UNMAPPED CATEGORY')], ['No aspiration data', s.noData, STATUS_STYLE['NO ASPIRATION DATA'].solid, byStatus('NO ASPIRATION DATA')]] as [string, number, string, Row[]][])
            .filter(([, n]) => n > 0).map(([l, n, col, rs]) => (
              <button key={l} onClick={() => open(l, rs)} title={`${l}: ${n} (${pctOf(n, s.total)})`} className="h-full hover:opacity-80" style={{ width: `${(n / Math.max(1, s.total)) * 100}%`, background: col }} />
            ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
          {([['Scored population', s.scored, '#0F9490'], ['Incomplete data', s.incomplete, STATUS_STYLE['INCOMPLETE DATA'].solid], ['Unmapped category', s.unmapped, STATUS_STYLE['UNMAPPED CATEGORY'].solid], ['No aspiration data', s.noData, STATUS_STYLE['NO ASPIRATION DATA'].solid]] as [string, number, string][]).map(([l, n, col]) => (
            <div key={l} className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: col }} /><span className="text-slate-600">{l}</span><b className="ml-auto tabular-nums text-navy-900">{n}</b><span className="w-12 text-right tabular-nums text-slate-500">{pctOf(n, s.total)}</span></div>
          ))}
        </div>
      </Section>

      <div className="grid gap-5 xl:grid-cols-3">
        <Section title="A. Aspiration alignment distribution" subtitle={`Denominator: scored population (${s.scored})`}>
          <ClassBars data={ALIGNMENT_CLASSES.map((c) => ({ name: c, value: s.byClass[c] }))} denom={s.scored} onClick={(c) => open(c, byStatus(c))} />
          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Average alignment score: <b className="text-navy-900">{s.averageScore === null ? NA : `${s.averageScore.toFixed(1)}%`}</b></div>
        </Section>
        <Section title="F. Aspiration score distribution" subtitle="Employees per score value (the 70:30 model yields 9 possible scores)" className="xl:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={scoreDist} margin={{ left: 0, right: 10, top: 8 }}>
                <CartesianGrid vertical={false} stroke={C.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(v, _n, item) => [`${v} employees`, (item as { payload?: { cls?: string } })?.payload?.cls ?? '']} />
                <Bar dataKey="Employees" radius={[3, 3, 0, 0]} cursor="pointer" onClick={(d) => { const n = clickName(d); if (n) open(`Alignment score ${n}`, scoredRows.filter((r) => r.a.result!.displayAlignmentScore === n)); }}>
                  {scoreDist.map((d) => <Cell key={d.name} fill={STATUS_STYLE[d.cls].solid} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {(['shortTerm', 'longTerm'] as const).map((side) => {
          const dist = sideDist(side);
          const top = Math.max(1, ...dist.map((d) => d.rows.length));
          return (
            <Section key={side} title={`${side === 'shortTerm' ? 'B. Short-Term' : 'C. Long-Term'} aspiration distribution`} subtitle={`${side === 'shortTerm' ? 'CONV-Short Term Aspiration (weight 70%)' : 'CONV-Long Term Aspiration (weight 30%)'} · denominator: total population (${s.total})`}>
              <div className="space-y-2">
                {dist.map((d) => (
                  <button key={d.name} onClick={() => open(`${side === 'shortTerm' ? 'Short-Term' : 'Long-Term'}: ${d.name}`, d.rows)} disabled={!d.rows.length} className="group block w-full text-left disabled:cursor-default">
                    <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
                      <span className="truncate text-slate-700">{d.name}{d.cat && <span className="ml-1.5 rounded px-1 text-[10px] font-semibold" style={{ background: STATUS_STYLE[d.cat.point === 3 ? 'HIGH ALIGNMENT' : d.cat.point === 2 ? 'MEDIUM ALIGNMENT' : 'LOW ALIGNMENT'].bg, color: STATUS_STYLE[d.cat.point === 3 ? 'HIGH ALIGNMENT' : d.cat.point === 2 ? 'MEDIUM ALIGNMENT' : 'LOW ALIGNMENT'].fg }}>{d.cat.classification} · {d.cat.point} pt</span>}</span>
                      <span className="shrink-0 tabular-nums text-slate-500"><b className="text-navy-900">{d.rows.length}</b> · {pctOf(d.rows.length, s.total)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full group-hover:opacity-80" style={{ width: `${(d.rows.length / top) * 100}%`, background: d.cat ? (d.cat.point === 3 ? '#0F8A6C' : d.cat.point === 2 ? '#C9973B' : '#B4443E') : '#CBD5E1' }} /></div>
                  </button>
                ))}
              </div>
            </Section>
          );
        })}
      </div>

      <Section title="E. Short-Term vs Long-Term — effect of the 70:30 weighting" subtitle="Rows: short-term category level (70%) · columns: long-term level (30%) · each cell shows the resulting score and the number of employees" className="mt-5">
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead><tr><th className="px-2 py-1 text-left text-[11px] text-slate-500">Short-Term ↓ / Long-Term →</th>{LEVELS.map((l) => <th key={l.label} className="px-2 py-1 text-center text-[11px] text-slate-600">{l.label} ({l.point})</th>)}</tr></thead>
            <tbody>
              {LEVELS.map((st) => (
                <tr key={st.label}>
                  <th className="whitespace-nowrap px-2 py-1 text-left font-semibold text-slate-700">{st.label} ({st.point})</th>
                  {LEVELS.map((lt) => {
                    const res = calculateAspirationAlignment(st.point, lt.point);
                    const rs = scoredRows.filter((r) => r.a.result!.shortTermPoint === st.point && r.a.result!.longTermPoint === lt.point);
                    const tone = STATUS_STYLE[res.alignmentClassification];
                    return (
                      <td key={lt.label} className="p-1">
                        <button onClick={() => open(`ST ${st.label} × LT ${lt.label} = ${res.displayAlignmentScore}`, rs)} className="flex h-20 w-40 flex-col items-center justify-center rounded-md transition hover:ring-2 hover:ring-navy-900" style={{ background: tone.bg, color: tone.fg }}>
                          <span className="text-lg font-bold tabular-nums">{res.displayAlignmentScore}</span>
                          <span className="text-[10px] font-semibold">{res.alignmentClassification}</span>
                          <span className="mt-0.5 text-[11px]"><b className="tabular-nums">{rs.length}</b> employees</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Because short-term carries 70%: a High short-term aspiration is always HIGH ALIGNMENT (≥ 80%), whatever the long-term level. A Low short-term aspiration is always LOW ALIGNMENT (≤ 53.3%), even with a High long-term aspiration.</p>
      </Section>

      <Section title={`D. Alignment by ${dimLabel}`} subtitle="HIGH / MEDIUM / LOW counts per unit (top 12 by headcount in the chart) · % of each unit's scored population in the table"
        action={<Select value={dim} onChange={(v) => setDim(v as OrgDim)} options={ORG_CHOICES.map((d) => ({ value: d.key, label: d.label }))} />} className="mt-5">
        <div className="h-80">
          <ResponsiveContainer>
            <BarChart data={orgData.slice(0, 12)} layout="vertical" margin={{ left: 10, right: 16 }}>
              <CartesianGrid horizontal={false} stroke={C.grid} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} tickFormatter={(x: string) => (x.length > 26 ? x.slice(0, 25) + '…' : x)} />
              <Tooltip />
              <Legend />
              {(['HIGH', 'MEDIUM', 'LOW'] as const).map((k) => <Bar key={k} dataKey={k} stackId="a" fill={STATUS_STYLE[`${k} ALIGNMENT` as AlignmentStatus].solid} cursor="pointer"
                onClick={(d) => { const n = clickName(d); const g = orgData.find((o) => o.name === n); if (g) open(`${k} ALIGNMENT · ${dimLabel}: ${n}`, g.rs.filter((r) => r.a.status === `${k} ALIGNMENT`)); }} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-500"><tr>{[dimLabel, 'Total', 'Scored', 'HIGH', 'MEDIUM', 'LOW', '% HIGH', 'Avg score', 'Not scored'].map((h, i) => <th key={h} className={cx('px-3 py-2', i ? 'text-right' : 'text-left')}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {orgData.map((o) => (
                <tr key={o.name} className="cursor-pointer hover:bg-teal-50/60" onClick={() => open(`${dimLabel}: ${o.name}`, o.rs)}>
                  <td className="px-3 py-1.5 text-navy-900">{o.name}</td>
                  {[o.x.total, o.x.scored, o.HIGH, o.MEDIUM, o.LOW, pctOf(o.HIGH, o.x.scored), o.x.averageScore === null ? NA : `${o.x.averageScore.toFixed(1)}%`, o.x.total - o.x.scored].map((v, i) => <td key={i} className="px-3 text-right tabular-nums">{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Employee aspiration alignment" subtitle="Click a row for the alignment card and scoring breakdown" png={false} className="mt-5">
        <ResultTable rows={rows} onOpen={setCard} />
      </Section>

      <Section title="Unmapped category review" subtitle="Values that do not exactly match one of the 10 approved categories. They are never scored and never mapped automatically." className="mt-5" png={false}>
        {unmappedValues.length ? (
          <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Original value</th><th className="px-3 text-left">Field</th><th className="px-3 text-right">Employees</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {unmappedValues.map((u) => (
                  <tr key={u.side + u.value} className="cursor-pointer hover:bg-teal-50/60" onClick={() => open(`Unmapped ${u.side}: "${u.value}"`, u.rs)}>
                    <td className="px-3 py-1.5 text-navy-900">"{u.value}"</td><td className="px-3">{u.side === 'ST' ? 'CONV-Short Term Aspiration' : 'CONV-Long Term Aspiration'}</td><td className="px-3 text-right tabular-nums">{u.rs.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="py-3 text-center text-sm text-slate-400">No unmapped values in the current population.</p>}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><Lock size={12} />Approved categories, points and formula are fixed business rules (see Mapping & Rules).</p>
      </Section>

      {card && <AlignmentCardModal e={card.e} a={card.a} onClose={() => setCard(null)} />}
    </div>
  );
}
