import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, X, Plus, RotateCcw, Save } from 'lucide-react';
import { useApp } from '../state/AppState';
import { MappingEditor } from '../components/MappingEditor';
import { Section, PageHeader, Button, Note, Select, Badge } from '../components/ui';
import { AppConfig, DEFAULT_CONFIG, RANK_DIMENSIONS, RankDimension, MatrixConfig } from '../lib/config';
import { ColumnMapping, FieldKey } from '../lib/fields';
import { Employee } from '../lib/model';

const fieldsFor: Record<RankDimension, FieldKey[]> = {
  talent: ['talentLY', 'talentCY'], calib: ['calibLY', 'calibCY'], talent12Box: ['talent12Box'], talentCluster: ['talentCluster'], talentCategory: ['talentCategory'],
};

function valuesFor(list: Employee[], dim: RankDimension): string[] {
  const s = new Set<string>();
  for (const e of list) for (const k of fieldsFor[dim]) if (e.v[k]) s.add(e.v[k]);
  return [...s].sort();
}

function RankEditor({ dim, values, order, onChange }: { dim: RankDimension; values: string[]; order: string[]; onChange: (o: string[]) => void }) {
  const missing = values.filter((v) => !order.some((o) => o.toLowerCase() === v.toLowerCase()));
  const move = (i: number, d: -1 | 1) => {
    const o = [...order];
    const j = i + d;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    onChange(o);
  };
  const meta = RANK_DIMENSIONS.find((r) => r.key === dim)!;
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-xs font-semibold text-navy-900">{meta.label}</div>
      <div className="mb-2 text-[11px] text-slate-500">{meta.help} Highest rank first.</div>
      {order.length === 0 && <div className="mb-2 text-[11px] text-amber-700">No hierarchy configured — movement will be reported as "Unranked".</div>}
      <ol className="space-y-1">
        {order.map((o, i) => (
          <li key={o} className="flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs">
            <span className="w-5 text-right tabular-nums text-slate-400">{i + 1}.</span>
            <span className="flex-1 text-navy-900">{o}</span>
            {!values.some((v) => v.toLowerCase() === o.toLowerCase()) && <Badge tone="amber">not in data</Badge>}
            <button onClick={() => move(i, -1)} className="rounded p-0.5 text-slate-500 hover:bg-white" aria-label="Move up"><ArrowUp size={13} /></button>
            <button onClick={() => move(i, 1)} className="rounded p-0.5 text-slate-500 hover:bg-white" aria-label="Move down"><ArrowDown size={13} /></button>
            <button onClick={() => onChange(order.filter((x) => x !== o))} className="rounded p-0.5 text-slate-500 hover:bg-white" aria-label="Remove"><X size={13} /></button>
          </li>
        ))}
      </ol>
      {missing.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {missing.map((m) => (
            <button key={m} onClick={() => onChange([...order, m])} className="flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-600 hover:border-teal-500 hover:text-teal-700"><Plus size={11} />{m}</button>
          ))}
          <button onClick={() => onChange([...order, ...missing])} className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-teal-700 hover:underline">Add all</button>
        </div>
      )}
    </div>
  );
}

function MatrixEditor({ labels, mx, onChange }: { labels: string[]; mx: MatrixConfig; onChange: (m: MatrixConfig) => void }) {
  const cellOptions = [{ value: '', label: '— Not placed —' }, ...Array.from({ length: mx.rows }).flatMap((_, r) => Array.from({ length: mx.cols }).map((__, c) => ({ value: `${r},${c}`, label: `Row ${r + 1} (top=1) · Col ${c + 1} (left=1)` })))];
  const setCell = (l: string, v: string) => {
    const cells = { ...mx.cells };
    if (!v) delete cells[l];
    else { const [r, c] = v.split(',').map(Number); cells[l] = { r, c }; }
    onChange({ ...mx, cells });
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Rows" value={String(mx.rows)} onChange={(v) => onChange({ ...mx, rows: Number(v) })} options={['2', '3', '4', '5']} />
          <Select label="Columns" value={String(mx.cols)} onChange={(v) => onChange({ ...mx, cols: Number(v) })} options={['2', '3', '4', '5']} />
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Horizontal axis</span><input className="h-9 rounded-lg border border-slate-300 px-2 text-sm" value={mx.xAxis} onChange={(e) => onChange({ ...mx, xAxis: e.target.value })} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Vertical axis</span><input className="h-9 rounded-lg border border-slate-300 px-2 text-sm" value={mx.yAxis} onChange={(e) => onChange({ ...mx, yAxis: e.target.value })} /></label>
        </div>
        <div className="space-y-1.5">
          {labels.length === 0 && <p className="text-xs text-slate-400">Upload a dataset to see its 12-Box classes.</p>}
          {labels.map((l) => (
            <div key={l} className="flex items-center gap-2">
              <span className="w-44 shrink-0 truncate text-xs text-navy-900" title={l}>{l}</span>
              <select className="h-8 flex-1 rounded-md border border-slate-300 px-1.5 text-xs" value={mx.cells[l] ? `${mx.cells[l].r},${mx.cells[l].c}` : ''} onChange={(e) => setCell(l, e.target.value)}>
                {cellOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Preview ({mx.yAxis} ↑ · {mx.xAxis} →)</div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${mx.cols}, minmax(0,1fr))` }}>
          {Array.from({ length: mx.rows }).flatMap((_, r) => Array.from({ length: mx.cols }).map((__, c) => {
            const here = Object.entries(mx.cells).filter(([l, p]) => p.r === r && p.c === c && labels.includes(l)).map(([l]) => l);
            return <div key={`${r}${c}`} className={`flex min-h-[64px] items-center justify-center rounded-md border p-1 text-center text-[11px] ${here.length ? 'border-teal-500 bg-teal-50 text-navy-900' : 'border-dashed border-slate-300 text-slate-300'}`}>{here.join(' / ') || `${r + 1},${c + 1}`}</div>;
          }))}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { raw, mapping, updateMapping, employees, config, setConfig } = useApp();
  const [draftMap, setDraftMap] = useState<ColumnMapping | null>(mapping);
  const [draft, setDraft] = useState<AppConfig>(config);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraftMap(mapping), [mapping]);
  const boxLabels = useMemo(() => valuesFor(employees, 'talent12Box'), [employees]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);

  const save = () => { setConfig(draft); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-5">
      <PageHeader title="Mapping & Rules" subtitle="Configure how Excel columns map to analytics fields, the talent hierarchy used for movement, and the 9/12-box matrix layout"
        actions={<>
          <Button variant="secondary" onClick={() => setDraft(DEFAULT_CONFIG)}><RotateCcw size={15} />Reset rules</Button>
          <Button disabled={!dirty} onClick={save}><Save size={15} />{saved ? 'Saved' : 'Save rules'}</Button>
        </>} />

      <Section title="Column mapping" subtitle={raw ? `Active file: ${raw.fileName}. Changes re-process the stored dataset; the source file is never modified.` : 'Upload a dataset to edit its column mapping.'}
        action={raw && draftMap && <Button disabled={JSON.stringify(draftMap) === JSON.stringify(mapping)} onClick={() => updateMapping(draftMap)}><Save size={15} />Apply mapping</Button>}>
        {raw && draftMap ? <MappingEditor headers={raw.headers} mapping={draftMap} onChange={setDraftMap} /> : <p className="text-sm text-slate-400">No dataset loaded.</p>}
      </Section>

      <Section title="Talent hierarchy (movement rules)" subtitle="Upgrade / downgrade are only computed between values ranked here. Values found in the data are offered below each list.">
        <div className="mb-3"><Note>Default rule: for the Yes/No talent and calibration flags, "Yes" is ranked above "No". Classification hierarchies (12 Box, Cluster, Category) are left empty until you define them.</Note></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {RANK_DIMENSIONS.map((d) => (
            <RankEditor key={d.key} dim={d.key} values={valuesFor(employees, d.key)} order={draft.ranks[d.key]} onChange={(o) => setDraft({ ...draft, ranks: { ...draft.ranks, [d.key]: o } })} />
          ))}
        </div>
      </Section>

      <Section title="Talent matrix layout" subtitle="Place each Talent Class 12 Box value on the grid. No positions are assumed; unplaced classes are listed separately on the matrix page.">
        <MatrixEditor labels={boxLabels} mx={draft.matrix} onChange={(m) => setDraft({ ...draft, matrix: m })} />
      </Section>

      <Section title="Data interpretation rules" subtitle="Applied consistently across all modules">
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
          <li>Blank cells are displayed as <b>N/A</b>; no value is imputed.</li>
          <li>Talent, Calibration, Hidden Gems, Free Rider and Low Performer are counted as positive only when the value is "Yes" (or Y / True / Ya).</li>
          <li>An employee is a successor only when "Identified as Successor" contains a value other than blank, No, 0, "-" or N/A (e.g. "1 Positions").</li>
          <li>Duplicated "Scale" and "Score" columns are assigned to the nearest preceding "Year -1/-2/-3" column; the year label shown is the value in that Year column.</li>
          <li>Duplicate Personnel Numbers: the first occurrence is imported, later occurrences are reported as errors.</li>
          <li>Rules and layout are stored in this browser only.</li>
        </ul>
      </Section>
    </div>
  );
}
