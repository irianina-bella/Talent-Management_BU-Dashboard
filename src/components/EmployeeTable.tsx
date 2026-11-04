import { useMemo, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Employee, isYes } from '../lib/model';
import { val } from '../lib/analytics';
import { compareRank } from '../lib/config';
import { useApp } from '../state/AppState';
import { Badge, cx } from './ui';
import { FieldKey } from '../lib/fields';

export function MovementBadge({ e }: { e: Employee }) {
  const { config } = useApp();
  const m = compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY);
  if (m === 'Upgrade') return <Badge tone="green"><ArrowUp size={11} />Up</Badge>;
  if (m === 'Downgrade') return <Badge tone="red"><ArrowDown size={11} />Down</Badge>;
  if (m === 'Stable') return <Badge><Minus size={11} />Stable</Badge>;
  return <Badge>{m === 'No data' ? 'N/A' : 'Unranked'}</Badge>;
}

export function FlagCell({ v }: { v: string }) {
  if (!v) return <span className="text-slate-400">N/A</span>;
  return isYes(v) ? <Badge tone="teal">{v}</Badge> : <span className="text-slate-600">{v}</span>;
}

const COLS: { key: FieldKey; label: string; flag?: boolean }[] = [
  { key: 'personnelNumber', label: 'Personnel No.' },
  { key: 'employeeName', label: 'Name' },
  { key: 'positionName', label: 'Position' },
  { key: 'companyName', label: 'Company' },
  { key: 'talent12Box', label: '12 Box' },
  { key: 'talentCategory', label: 'Category' },
  { key: 'talentLY', label: 'Talent LY', flag: true },
  { key: 'talentCY', label: 'Talent CY', flag: true },
];

export function EmployeeTable({ employees, pageSize = 15, extraCols = [] }: { employees: Employee[]; pageSize?: number; extraCols?: { key: FieldKey; label: string; flag?: boolean }[] }) {
  const { openProfile } = useApp();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ k: FieldKey; dir: 1 | -1 }>({ k: 'employeeName', dir: 1 });
  const cols = [...COLS, ...extraCols];

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = t ? employees.filter((e) => [e.v.employeeName, e.v.personnelNumber, e.v.positionName, e.v.departmentName, e.v.divisionName].some((s) => s.toLowerCase().includes(t))) : employees;
    return [...list].sort((a, b) => a.v[sort.k].localeCompare(b.v[sort.k], undefined, { numeric: true }) * sort.dir);
  }, [employees, q, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const p = Math.min(page, pages - 1);
  const slice = rows.slice(p * pageSize, p * pageSize + pageSize);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={15} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name, ID, position, unit…" className="h-9 w-full rounded-lg border border-slate-300 pl-8 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100" />
        </div>
        <span className="text-xs text-slate-500">{rows.length.toLocaleString()} records</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className="cursor-pointer whitespace-nowrap px-3 py-2 font-medium hover:text-navy-900" onClick={() => setSort({ k: c.key, dir: sort.k === c.key ? (sort.dir === 1 ? -1 : 1) : 1 })}>
                  {c.label}{sort.k === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              <th className="px-3 py-2 font-medium">Movement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slice.map((e) => (
              <tr key={e.id} onClick={() => openProfile(e)} className="cursor-pointer hover:bg-teal-50/60">
                {cols.map((c) => (
                  <td key={c.key} className={cx('px-3 py-2', c.key === 'employeeName' ? 'font-medium text-navy-900' : 'text-slate-600', c.key === 'positionName' ? 'max-w-[220px] truncate' : 'whitespace-nowrap')} title={e.v[c.key]}>
                    {c.flag ? <FlagCell v={e.v[c.key]} /> : val(e, c.key) === 'N/A' ? <span className="text-slate-400">N/A</span> : val(e, c.key)}
                  </td>
                ))}
                <td className="px-3 py-2"><MovementBadge e={e} /></td>
              </tr>
            ))}
            {!slice.length && <tr><td colSpan={cols.length + 1} className="px-3 py-8 text-center text-slate-400">No employees match.</td></tr>}
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
