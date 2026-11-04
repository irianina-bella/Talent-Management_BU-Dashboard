import { useMemo } from 'react';
import { ArrowUp, ArrowDown, Settings } from 'lucide-react';
import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { Section, PageHeader, Button, Note } from '../components/ui';
import type { TableCol } from '../components/EmployeeTable';
import { compareRank, matchMatrixLabel } from '../lib/config';
import { Employee, NA } from '../lib/model';
import type { PageKey } from '../components/Layout';

/** Professional 12-box palette: rows = potential (top = high), cols = performance (left = low). */
const PALETTE: { bg: string; fg: string; sub: string }[][] = [
  [{ bg: '#F6E7B4', fg: '#5C4A0E', sub: '#7A6520' }, { bg: '#BFE6E3', fg: '#0B3D3B', sub: '#245F5C' }, { bg: '#14A9A4', fg: '#FFFFFF', sub: '#E3F7F6' }, { bg: '#0B5E4A', fg: '#FFFFFF', sub: '#CFEDE4' }],
  [{ bg: '#F7D2B8', fg: '#6B2E0B', sub: '#86441E' }, { bg: '#D6E2F2', fg: '#13294B', sub: '#2C4F80' }, { bg: '#5B7BA6', fg: '#FFFFFF', sub: '#E5ECF6' }, { bg: '#1E3A64', fg: '#FFFFFF', sub: '#D3DDEC' }],
  [{ bg: '#E9B4AF', fg: '#5E1712', sub: '#7D2A24' }, { bg: '#E5E9EF', fg: '#334155', sub: '#475569' }, { bg: '#CDE8D2', fg: '#1F4D2B', sub: '#2F6A3E' }, { bg: '#F3E08A', fg: '#5C4A0E', sub: '#6E5A16' }],
];

export const MATRIX_LIST_COLUMNS: TableCol[] = [
  { key: 'employeeName', label: 'Employee Name' },
  { key: 'personnelNumber', label: 'Personnel No.' },
  { key: 'companyName', label: 'Company' },
  { key: 'businessUnit', label: 'Business Unit' },
  { key: 'directorateName', label: 'Directorate' },
  { key: 'divisionName', label: 'Division' },
  { key: 'departmentName', label: 'Department' },
  { key: 'positionName', label: 'Position' },
  { key: 'talent12Box', label: 'Talent Class' },
  { key: 'talentCY', label: 'Talent CY', flag: true },
  { key: 'calibCY', label: 'Calib CY', flag: true },
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
  const pctOf = (n: number) => (total ? `${((n / total) * 100).toFixed(1)}%` : '0%');
  const open = (title: string, employees: Employee[], subtitle: string) => openList({ title, subtitle, employees, columns: MATRIX_LIST_COLUMNS });

  return (
    <div>
      <PageHeader title="12 Box Talent Matrix" subtitle='Employees placed by their "Talent Class 12 Box Text" value · Performance (horizontal) × Potential (vertical)'
        actions={<Button variant="secondary" onClick={() => navigate('settings')}><Settings size={15} />Edit matrix mapping</Button>} />
      <FilterBar showYear={false} />

      <Section title="Talent Matrix" subtitle={`${placedCount.toLocaleString()} of ${total.toLocaleString()} employees placed · click a box to see the employees · % of total employees in scope`}>
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
              <div className="grid flex-1 gap-1.5 rounded-lg bg-white" style={{ gridTemplateColumns: `repeat(${mx.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${mx.rows}, 9rem)` }} role="grid" aria-label="12 Box Talent Matrix">
                {Array.from({ length: mx.rows }).flatMap((_, r) => Array.from({ length: mx.cols }).map((__, c) => {
                  const labels = labelAt(r, c);
                  const es = labels.flatMap((l) => byLabel.get(l) || []);
                  const tone = PALETTE[r]?.[c] ?? { bg: '#F1F5F9', fg: '#0B1F3A', sub: '#475569' };
                  const up = es.filter((e) => compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY) === 'Upgrade').length;
                  const down = es.filter((e) => compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY) === 'Downgrade').length;
                  const name = labels.length ? labels.join(' / ') : '—';
                  return (
                    <button key={`${r}-${c}`} role="gridcell"
                      onClick={() => open(name, es, `${mx.rowLabels[r] ?? ''} · ${mx.colLabels[c] ?? ''} ${mx.xAxis}`)}
                      className="group relative flex h-full flex-col justify-between rounded-md p-3 text-left transition hover:ring-2 hover:ring-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-900"
                      style={{ background: tone.bg, color: tone.fg }}
                      title={`${name}: ${es.length} employees (${pctOf(es.length)})`}>
                      <div className="text-[13px] font-bold leading-tight">{name}</div>
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <div className="text-3xl font-bold leading-none tabular-nums">{es.length}</div>
                          <div className="mt-1 text-[11px] font-medium" style={{ color: tone.sub }}>{es.length === 1 ? 'Employee' : 'Employees'} · <span className="font-bold tabular-nums">{pctOf(es.length)}</span></div>
                        </div>
                        {(up > 0 || down > 0) && (
                          <div className="flex flex-col items-end gap-0.5 text-[10px] font-semibold" title="Talent flag movement last year → current year">
                            {up > 0 && <span className="flex items-center rounded bg-white/85 px-1 text-emerald-700"><ArrowUp size={10} />{up}</span>}
                            {down > 0 && <span className="flex items-center rounded bg-white/85 px-1 text-red-700"><ArrowDown size={10} />{down}</span>}
                          </div>
                        )}
                      </div>
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
        <p className="mt-3 text-[11px] text-slate-400">Percentage = employees in box ÷ total employees in the current filter ({total.toLocaleString()}) × 100. ↑/↓ = talent flag movement from last year.</p>
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
