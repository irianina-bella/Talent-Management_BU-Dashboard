import { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, Settings } from 'lucide-react';
import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { Section, PageHeader, Select, Note, Button, cx } from '../components/ui';
import { groupBy, val, fmtPct } from '../lib/analytics';
import { compareRank, sortByRank } from '../lib/config';
import { Employee, NA } from '../lib/model';
import { FieldKey } from '../lib/fields';
import type { PageKey } from '../components/Layout';

function Tile({ label, list, total, onOpen, big }: { label: string; list: Employee[]; total: number; onOpen: () => void; big?: boolean }) {
  const { config } = useApp();
  const up = list.filter((e) => compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY) === 'Upgrade').length;
  const down = list.filter((e) => compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY) === 'Downgrade').length;
  const share = total ? list.length / total : 0;
  return (
    <button onClick={onOpen} disabled={!list.length}
      className={cx('flex w-full flex-col justify-between rounded-lg border p-3 text-left transition hover:border-teal-500 hover:shadow-md disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:shadow-none', big ? 'min-h-[118px]' : 'min-h-[96px]', list.length ? 'border-slate-200' : 'border-dashed border-slate-200 bg-slate-50')}
      style={list.length ? { background: `rgba(15,148,144,${0.05 + share * 0.9})` } : undefined}>
      <div className={cx('text-xs font-semibold leading-tight', share > 0.35 ? 'text-white' : 'text-navy-900')}>{label}</div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className={cx('text-2xl font-semibold tabular-nums', share > 0.35 ? 'text-white' : 'text-navy-900')}>{list.length}</div>
          <div className={cx('text-[11px]', share > 0.35 ? 'text-teal-50' : 'text-slate-500')}>{fmtPct(list.length, total)}</div>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-[11px] font-medium">
          {up > 0 && <span className="flex items-center rounded bg-white/90 px-1 text-emerald-700"><ArrowUp size={11} />{up}</span>}
          {down > 0 && <span className="flex items-center rounded bg-white/90 px-1 text-red-700"><ArrowDown size={11} />{down}</span>}
        </div>
      </div>
    </button>
  );
}

export default function MatrixPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const { filtered: list, config, openList } = useApp();
  const [field, setField] = useState<FieldKey>('talent12Box');
  const groups = useMemo(() => groupBy(list, (e) => val(e, field)), [list, field]);
  const rank = field === 'talent12Box' ? config.ranks.talent12Box : field === 'talentCluster' ? config.ranks.talentCluster : config.ranks.talentCategory;
  const labels = sortByRank([...groups.keys()], rank);
  const mx = config.matrix;
  const placed = labels.filter((l) => mx.cells[l] && mx.cells[l].r < mx.rows && mx.cells[l].c < mx.cols);
  const unplaced = labels.filter((l) => !placed.includes(l));
  const hasGrid = field === 'talent12Box' && placed.length > 0;
  const open = (label: string) => openList({ title: `${label}`, subtitle: `${field === 'talent12Box' ? 'Talent Class 12 Box' : field === 'talentCluster' ? 'Talent Cluster' : 'Talent Category'}`, employees: groups.get(label) || [] });

  return (
    <div>
      <PageHeader title="9 Box / 12 Box Talent Matrix" subtitle="Employees grouped by the talent classification in the source file. ↑/↓ show talent movement from last year."
        actions={<>
          <Select value={field} onChange={(v) => setField(v as FieldKey)} options={[{ value: 'talent12Box', label: 'Talent Class 12 Box' }, { value: 'talentCluster', label: 'Talent Cluster' }, { value: 'talentCategory', label: 'Talent Category' }]} />
          <Button variant="secondary" onClick={() => navigate('settings')}><Settings size={15} />Configure layout</Button>
        </>} />
      <FilterBar showYear={false} />

      {hasGrid ? (
        <Section title={`Talent matrix (${mx.rows} × ${mx.cols})`} subtitle="Box positions come from your configuration in Mapping & Rules">
          <div className="flex gap-3">
            <div className="flex w-6 items-center justify-center"><span className="-rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-500">{mx.yAxis} →</span></div>
            <div className="flex-1">
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${mx.cols}, minmax(0, 1fr))` }}>
                {Array.from({ length: mx.rows }).flatMap((_, r) => Array.from({ length: mx.cols }).map((__, c) => {
                  const here = placed.filter((l) => mx.cells[l].r === r && mx.cells[l].c === c);
                  if (!here.length) return <div key={`${r}-${c}`} className="min-h-[118px] rounded-lg border border-dashed border-slate-200 bg-slate-50" />;
                  return <div key={`${r}-${c}`} className="space-y-2">{here.map((l) => <Tile key={l} big label={l} list={groups.get(l) || []} total={list.length} onOpen={() => open(l)} />)}</div>;
                }))}
              </div>
              <div className="mt-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">{mx.xAxis} →</div>
            </div>
          </div>
          {unplaced.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-xs font-medium text-slate-500">Classes without a configured position</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">{unplaced.map((l) => <Tile key={l} label={l} list={groups.get(l) || []} total={list.length} onOpen={() => open(l)} />)}</div>
            </div>
          )}
        </Section>
      ) : (
        <Section title="Talent classes" subtitle={field === 'talent12Box' ? 'Showing classes as tiles. Position them on a 9/12-box grid in Mapping & Rules — no box positions are assumed.' : 'Classes ordered by your configured ranking (or alphabetically).'}>
          {field === 'talent12Box' && <div className="mb-4"><Note>No matrix layout configured yet. Open <b>Mapping & Rules → Talent matrix layout</b> to assign each 12-Box class to a grid cell (rows × columns, axis names).</Note></div>}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {labels.map((l) => <Tile key={l} big label={l} list={groups.get(l) || []} total={list.length} onOpen={() => open(l)} />)}
          </div>
          {labels.includes(NA) && <p className="mt-3 text-[11px] text-slate-400">N/A = classification blank in the source file.</p>}
        </Section>
      )}
    </div>
  );
}
