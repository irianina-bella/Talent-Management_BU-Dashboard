import { CheckCircle2, AlertCircle } from 'lucide-react';
import { ColumnMapping, FIELDS, headerLabels } from '../lib/fields';
import { cx } from './ui';

export function MappingEditor({ headers, mapping, onChange }: { headers: string[]; mapping: ColumnMapping; onChange: (m: ColumnMapping) => void }) {
  const labels = headerLabels(headers);
  const groups = [...new Set(FIELDS.map((f) => f.group))];
  const usage: Record<number, number> = {};
  Object.values(mapping).forEach((i) => { if (i !== null) usage[i] = (usage[i] || 0) + 1; });

  return (
    <div className="grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-teal-700">{g}</div>
          <div className="space-y-1.5">
            {FIELDS.filter((f) => f.group === g).map((f) => {
              const idx = mapping[f.key];
              const dup = idx !== null && usage[idx] > 1;
              return (
                <div key={f.key} className="flex items-center gap-2">
                  <span className="shrink-0">{idx === null ? <AlertCircle size={14} className={f.required ? 'text-red-600' : 'text-amber-500'} /> : <CheckCircle2 size={14} className={dup ? 'text-amber-500' : 'text-teal-600'} />}</span>
                  <span className="w-40 shrink-0 truncate text-xs text-slate-700" title={f.label}>{f.label}{f.required && <span className="text-red-600"> *</span>}</span>
                  <select
                    value={idx === null ? '' : String(idx)}
                    onChange={(e) => onChange({ ...mapping, [f.key]: e.target.value === '' ? null : Number(e.target.value) })}
                    className={cx('h-8 min-w-0 flex-1 rounded-md border bg-white px-1.5 text-xs focus:border-teal-500 focus:outline-none', idx === null ? 'border-amber-300' : 'border-slate-300')}
                    title={dup ? 'This column is mapped to more than one field' : undefined}
                  >
                    <option value="">— Not mapped (N/A) —</option>
                    {labels.map((l, i) => <option key={i} value={i}>{l}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
