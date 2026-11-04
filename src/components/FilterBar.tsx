import { useMemo, useState } from 'react';
import { Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { useApp, FILTER_FIELDS, EMPTY_FILTERS, Filters } from '../state/AppState';
import { uniqueValues, val } from '../lib/analytics';
import { Select, Button, cx } from './ui';

/** Cascading filters: options for each field are computed from records matching all *other* active filters. */
export function FilterBar({ showYear = true }: { showYear?: boolean }) {
  const { employees, filters, setFilters, filtered } = useApp();
  const [open, setOpen] = useState(true);
  const activeCount = FILTER_FIELDS.filter((f) => filters[f.key]).length;

  const options = useMemo(() => {
    const o: Record<string, string[]> = {};
    for (const f of FILTER_FIELDS) {
      const others = FILTER_FIELDS.filter((x) => x.key !== f.key && filters[x.key]);
      const subset = others.length ? employees.filter((e) => others.every((x) => val(e, x.key) === filters[x.key])) : employees;
      o[f.key] = uniqueValues(subset, f.key);
    }
    return o;
  }, [employees, filters]);

  const set = (k: keyof Filters, v: string) => setFilters({ ...filters, [k]: v } as Filters);

  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-medium text-navy-900">
          <Filter size={15} className="text-teal-600" /> Filters
          {activeCount > 0 && <span className="rounded-full bg-teal-600 px-1.5 text-[11px] text-white">{activeCount}</span>}
          <ChevronDown size={15} className={cx('text-slate-400 transition', !open && '-rotate-90')} />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500"><b className="tabular-nums text-navy-900">{filtered.length.toLocaleString()}</b> of {employees.length.toLocaleString()} employees</span>
          {(activeCount > 0 || filters.year !== 'current') && (
            <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => setFilters(EMPTY_FILTERS)}><RotateCcw size={13} /> Reset</Button>
          )}
        </div>
      </div>
      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 px-4 py-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10">
          {FILTER_FIELDS.map((f) => (
            <Select key={f.key} label={f.label} value={filters[f.key]} onChange={(v) => set(f.key, v)} options={options[f.key]} allLabel="All" />
          ))}
          {showYear && (
            <Select label="Year" value={filters.year} onChange={(v) => set('year', v)} options={[{ value: 'current', label: 'Current year' }, { value: 'last', label: 'Last year' }]} />
          )}
        </div>
      )}
    </div>
  );
}
