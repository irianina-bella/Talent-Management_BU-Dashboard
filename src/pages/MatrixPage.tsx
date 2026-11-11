import { useMemo } from 'react';
import { ArrowUp, ArrowDown, Settings, Users, Gem, Sprout, Star, AlertTriangle, BarChart3, TrendingUp, XCircle, GraduationCap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { Section, PageHeader, Button, Note } from '../components/ui';
import type { TableCol } from '../components/EmployeeTable';
import { compareRank, matchMatrixLabel, TWELVE_BOX } from '../lib/config';
import { Employee, NA } from '../lib/model';
import type { PageKey } from '../components/Layout';

/** Approved icons per talent class. (Lucide has no "User Round Up"; TrendingUp is used for Future Leaders.) */
const ICONS: Record<string, LucideIcon> = {
  'Underutilized / Misplaced': Users, 'Diamond in the Rough': Gem, 'Emerging Leaders': Sprout, 'STAR Leaders': Star,
  'Strugglers': AlertTriangle, 'Steady Performer': BarChart3, 'Growing Talent': Users, 'Future Leaders': TrendingUp,
  'Misfits': XCircle, 'Average Worker': Users, 'Solid Contributor': Settings, 'Experts': GraduationCap,
};
const FALLBACK = { no: 0, bg: '#E2E8F0', fg: '#0B1F3A', sub: '#475569' };

export const MATRIX_LIST_COLUMNS: TableCol[] = [
  { key: 'employeeName', label: 'Employee Name' },
  { key: 'personnelNumber', label: 'Personnel No.' },
  { key: 'companyName', label: 'Company' },
  { key: 'businessUnit', label: 'Business Unit' },
  { key: 'directorateName', label: 'Directorate' },
  { key: 'divisionName', label: 'Division' },
  { key: 'departmentName', label: 'Department' },
  { key: 'positionName', label: 'Position Name' },
];

export default function MatrixPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const { filtered: list, config, openList } = useApp();
  const mx = config.matrix;
  const total = list.length;

  // Group employees by the matrix label their Excel "Talent Class 12 Box Text" value matches.
  const { byLabel, unplaced } = useMemo(() => {
    const byLabel = new Map<string, Employee[]>();
    const unplaced = new Map<string, Employee[]>();
    for (const e of list) {
      const raw = e.v.talent12Box;
      const label = raw ? matchMatrixLabel(raw, mx) : null;
      const cell = label ? mx.cells[label] : undefined;
      if (label && cell && cell.r < mx.rows && cell.c < mx.cols) {
        if (!byLabel.has(label)) byLabel.set(label, []);
        byLabel.get(label)!.push(e);
      } else {
        const k = raw || NA;
        if (!unplaced.has(k)) unplaced.set(k, []);
        unplaced.get(k)!.push(e);
      }
    }
    return { byLabel, unplaced };
  }, [list, mx]);

  const labelAt = (r: number, c: number) => Object.keys(mx.cells).filter((l) => mx.cells[l].r === r && mx.cells[l].c === c);
  const placedCount = [...byLabel.values()].reduce((s, es) => s + es.length, 0);
  const pctOf = (n: number, t: number) => (t ? `${((n / t) * 100).toFixed(1)}%` : '0%');
  const open = (title: string, employees: Employee[], subtitle: string) => openList({ title, subtitle, employees, columns: MATRIX_LIST_COLUMNS });

  return (
    <div>
      <PageHeader title="12 Box Talent Matrix" subtitle='Employees placed by their "Talent Class 12 Box Text" value · Performance (horizontal) × Potential (vertical)'
        actions={<Button variant="secondary" onClick={() => navigate('settings')}><Settings size={15} />Edit matrix mapping</Button>} />
      <FilterBar showYear={false} />

      <Section title="Talent Matrix" subtitle={`${placedCount.toLocaleString()} of ${total.toLocaleString()} employees placed · click a box to see its employees`}>
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[760px]">
            <div className="flex">
              {/* Vertical axis */}
              <div className="flex w-8 shrink-0 items-center justify-center">
                <span className="-rotate-90 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.25em] text-navy-900">{mx.yAxis}</span>
              </div>
              {/* Row labels */}
              <div className="grid w-28 shrink-0 gap-1.5" style={{ gridTemplateRows: `repeat(${mx.rows}, minmax(0, 1fr))` }}>
                {Array.from({ length: mx.rows }).map((_, r) => (
                  <div key={r} className="flex items-center justify-end pr-3 text-right text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-600">
                    {mx.rowLabels[r] ?? `Row ${r + 1}`}
                  </div>
                ))}
              </div>
              {/* Grid */}
              <div className="grid flex-1 gap-1.5 rounded-lg bg-white" style={{ gridTemplateColumns: `repeat(${mx.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${mx.rows}, 10.5rem)` }} role="grid" aria-label="12 Box Talent Matrix">
                {Array.from({ length: mx.rows }).flatMap((_, r) => Array.from({ length: mx.cols }).map((__, c) => {
                  const labels = labelAt(r, c);
                  const es = labels.flatMap((l) => byLabel.get(l) || []);
                  const name = labels.length ? labels.join(' / ') : '—';
                  const meta = (labels.length === 1 && TWELVE_BOX[labels[0]]) || FALLBACK;
                  const Icon = labels.length === 1 ? ICONS[labels[0]] : undefined;
                  const up = es.filter((e) => compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY) === 'Upgrade').length;
                  const down = es.filter((e) => compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY) === 'Downgrade').length;
                  return (
                    <button key={`${r}-${c}`} role="gridcell"
                      onClick={() => open(meta.no ? `${meta.no}. ${name}` : name, es, `${mx.rowLabels[r] ?? ''} · ${mx.colLabels[c] ?? ''} ${mx.xAxis}`)}
                      className="relative flex h-full flex-col items-center justify-center rounded-lg border border-black/10 px-2 text-center shadow-sm transition hover:ring-2 hover:ring-navy-900 hover:ring-offset-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-900"
                      style={{ background: meta.bg, color: meta.fg }}
                      title={`${meta.no ? meta.no + '. ' : ''}${name}: ${es.length} employees (${pctOf(es.length, total)})`}>
                      {Icon && <Icon size={22} strokeWidth={2} aria-hidden="true" />}
                      {meta.no > 0 && <div className="mt-1 text-[26px] font-extrabold leading-none tabular-nums">{meta.no}</div>}
                      <div className="mt-1 text-[13px] font-bold leading-tight">{name}</div>
                      <div className="mt-1.5 text-[11px] font-medium leading-tight" style={{ color: meta.sub }}>
                        <span className="font-bold tabular-nums">{es.length}</span> {es.length === 1 ? 'Employee' : 'Employees'} · <span className="font-bold tabular-nums">{pctOf(es.length, total)}</span>
                      </div>
                      {(up > 0 || down > 0) && (
                        <div className="absolute right-1.5 top-1.5 flex gap-0.5 text-[10px] font-semibold" title="Talent flag movement last year → current year">
                          {up > 0 && <span className="flex items-center rounded bg-white/90 px-1 text-emerald-700"><ArrowUp size={10} />{up}</span>}
                          {down > 0 && <span className="flex items-center rounded bg-white/90 px-1 text-red-700"><ArrowDown size={10} />{down}</span>}
                        </div>
                      )}
                    </button>
                  );
                }))}
              </div>
            </div>
            {/* Column labels + horizontal axis */}
            <div className="flex">
              <div className="w-36 shrink-0" />
              <div className="grid flex-1 gap-1.5 pt-2" style={{ gridTemplateColumns: `repeat(${mx.cols}, minmax(0, 1fr))` }}>
                {Array.from({ length: mx.cols }).map((_, c) => (
                  <div key={c} className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600">{mx.colLabels[c] ?? `Col ${c + 1}`}</div>
                ))}
              </div>
            </div>
            <div className="flex">
              <div className="w-36 shrink-0" />
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-300" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-navy-900">{mx.xAxis} →</span>
                  <div className="h-px flex-1 bg-slate-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">Percentage = employees in box ÷ total employees in the current filter ({total.toLocaleString()}) × 100. Box positions follow the approved 12-box layout and are never sorted. ↑/↓ = talent flag movement from last year.</p>
      </Section>

      {unplaced.size > 0 && (
        <div className="mt-5">
          <Note>
            <b>{[...unplaced.values()].reduce((s, es) => s + es.length, 0)} employees</b> are not on the matrix because their Talent Class 12 Box value is blank or does not match a matrix class:{' '}
            {[...unplaced.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, es], i) => (
              <span key={k}>
                {i > 0 && ', '}
                <button className="font-semibold underline decoration-dotted hover:text-navy-900" onClick={() => open(k === NA ? 'Talent Class blank (N/A)' : k, es, 'Not placed on the matrix')}>{k === NA ? 'N/A (blank)' : `"${k}"`} ({es.length})</button>
              </span>
            ))}
            . Assign unmatched values in Mapping & Rules.
          </Note>
        </div>
      )}
    </div>
  );
}
