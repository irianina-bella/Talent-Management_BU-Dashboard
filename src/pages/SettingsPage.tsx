import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, X, Plus, RotateCcw, Save } from 'lucide-react';
import { useApp } from '../state/AppState';
import { MappingEditor } from '../components/MappingEditor';
import { Section, PageHeader, Button, Note, Select, Badge } from '../components/ui';
import { AppConfig, DEFAULT_CONFIG, DEFAULT_MATRIX, RANK_DIMENSIONS, RankDimension, MatrixConfig, matchMatrixLabel, AspirationCategory, DEFAULT_ASPIRATION_CATEGORIES, UNCLASSIFIED } from '../lib/config';
import { parseEntries } from '../lib/aspiration';
import { APPROVED_CATEGORIES, APPROVED_ALIASES } from '../analytics/aspirationCategoryMapping';
import { HIGH_THRESHOLD, MEDIUM_THRESHOLD, SHORT_TERM_WEIGHT, LONG_TERM_WEIGHT, evaluateEmployeeAlignment } from '../analytics/aspirationAlignment';
import { Lock } from 'lucide-react';
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

function MatrixEditor({ dataValues, mx, onChange }: { dataValues: string[]; mx: MatrixConfig; onChange: (m: MatrixConfig) => void }) {
  const cellOptions = [{ value: '', label: '— Not placed —' }, ...Array.from({ length: mx.rows }).flatMap((_, r) => Array.from({ length: mx.cols }).map((__, c) => ({ value: `${r},${c}`, label: `${mx.rowLabels[r] ?? `Row ${r + 1}`} · ${mx.colLabels[c] ?? `Col ${c + 1}`} ${mx.xAxis}` })))];
  const setCell = (l: string, v: string) => {
    const cells = { ...mx.cells };
    if (!v) delete cells[l];
    else {
      const [r, c] = v.split(',').map(Number);
      // One class per cell: move any class already in the target cell out of it.
      for (const k of Object.keys(cells)) if (k !== l && cells[k].r === r && cells[k].c === c) delete cells[k];
      cells[l] = { r, c };
    }
    onChange({ ...mx, cells });
  };
  const classes = [...new Set([...Object.keys(DEFAULT_MATRIX.cells), ...Object.keys(mx.cells)])];
  const unmatched = dataValues.filter((v) => !matchMatrixLabel(v, mx) && !classes.includes(v));
  const matchedValues = (label: string) => dataValues.filter((v) => matchMatrixLabel(v, mx) === label);
  const setLabel = (arr: 'rowLabels' | 'colLabels', i: number, v: string) => { const a = [...mx[arr]]; a[i] = v; onChange({ ...mx, [arr]: a }); };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Horizontal axis</span><input className="h-9 rounded-lg border border-slate-300 px-2 text-sm" value={mx.xAxis} onChange={(e) => onChange({ ...mx, xAxis: e.target.value })} /></label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Vertical axis</span><input className="h-9 rounded-lg border border-slate-300 px-2 text-sm" value={mx.yAxis} onChange={(e) => onChange({ ...mx, yAxis: e.target.value })} /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Row labels (top → bottom)</div>
            {Array.from({ length: mx.rows }).map((_, i) => <input key={i} className="h-8 w-full rounded-md border border-slate-300 px-2 text-xs" value={mx.rowLabels[i] ?? ''} onChange={(e) => setLabel('rowLabels', i, e.target.value)} />)}
          </div>
          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Column labels (left → right)</div>
            {Array.from({ length: mx.cols }).map((_, i) => <input key={i} className="h-8 w-full rounded-md border border-slate-300 px-2 text-xs" value={mx.colLabels[i] ?? ''} onChange={(e) => setLabel('colLabels', i, e.target.value)} />)}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">Talent class → matrix cell</div>
          <div className="space-y-1.5">
            {classes.map((l) => {
              const mv = matchedValues(l);
              return (
                <div key={l} className="flex items-center gap-2">
                  <div className="w-48 shrink-0">
                    <div className="truncate text-xs font-medium text-navy-900" title={l}>{l}</div>
                    <div className="truncate text-[10px] text-slate-400" title={mv.join(', ')}>{mv.length ? `Excel: ${mv.join(', ')}` : dataValues.length ? 'no matching Excel value' : ''}</div>
                  </div>
                  <select className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 px-1.5 text-xs" value={mx.cells[l] ? `${mx.cells[l].r},${mx.cells[l].c}` : ''} onChange={(e) => setCell(l, e.target.value)}>
                    {cellOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
        {unmatched.length > 0 && (
          <div>
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-amber-700">Excel values not recognised — assign a cell</div>
            <div className="space-y-1.5">
              {unmatched.map((l) => (
                <div key={l} className="flex items-center gap-2">
                  <span className="w-48 shrink-0 truncate text-xs text-navy-900" title={l}>"{l}"</span>
                  <select className="h-8 min-w-0 flex-1 rounded-md border border-amber-300 px-1.5 text-xs" value="" onChange={(e) => setCell(l, e.target.value)}>
                    {cellOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Preview ({mx.yAxis} ↑ · {mx.xAxis} →)</span>
          <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => onChange(DEFAULT_MATRIX)}><RotateCcw size={13} />Reset to default mapping</Button>
        </div>
        <div className="flex gap-2">
          <div className="grid w-24 shrink-0 gap-1.5" style={{ gridTemplateRows: `repeat(${mx.rows}, minmax(0,1fr))` }}>
            {Array.from({ length: mx.rows }).map((_, r) => <div key={r} className="flex items-center justify-end text-right text-[10px] font-semibold uppercase text-slate-500">{mx.rowLabels[r]}</div>)}
          </div>
          <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${mx.cols}, minmax(0,1fr))`, gridTemplateRows: `repeat(${mx.rows}, 4.5rem)` }}>
            {Array.from({ length: mx.rows }).flatMap((_, r) => Array.from({ length: mx.cols }).map((__, c) => {
              const here = Object.entries(mx.cells).filter(([, p]) => p.r === r && p.c === c).map(([l]) => l);
              return <div key={`${r}${c}`} className={`flex items-center justify-center rounded-md border p-1 text-center text-[11px] font-medium ${here.length ? 'border-teal-500 bg-teal-50 text-navy-900' : 'border-dashed border-slate-300 text-slate-300'}`}>{here.join(' / ') || 'empty'}</div>;
            }))}
          </div>
        </div>
        <div className="mt-1.5 flex gap-2">
          <div className="w-24 shrink-0" />
          <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${mx.cols}, minmax(0,1fr))` }}>
            {Array.from({ length: mx.cols }).map((_, c) => <div key={c} className="text-center text-[10px] font-semibold uppercase text-slate-500">{mx.colLabels[c]}</div>)}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Excel values are matched to classes case-insensitively, ignoring spaces, punctuation and plural "s" (e.g. "Average Workers" → Average Worker). Remember to press <b>Save rules</b>.</p>
      </div>
    </div>
  );
}

function AspirationEditor({ cats, onChange, employees }: { cats: AspirationCategory[]; onChange: (c: AspirationCategory[]) => void; employees: Employee[] }) {
  const set = (i: number, patch: Partial<AspirationCategory>) => onChange(cats.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, d: -1 | 1) => { const a = [...cats]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  const unclassified = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of employees) for (const k of ['shortTermAspiration', 'longTermAspiration'] as FieldKey[])
      for (const x of parseEntries(e.v[k], cats)) if (x.category === UNCLASSIFIED) m.set(x.original, (m.get(x.original) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  }, [employees, cats]);
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-2 xl:col-span-2">
        {cats.map((c, i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-5 text-right text-xs tabular-nums text-slate-400">{i + 1}.</span>
              <input className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 px-2 text-xs font-medium" value={c.name} onChange={(e) => set(i, { name: e.target.value })} aria-label="Category name" />
              <select className="h-8 rounded-md border border-slate-300 px-1.5 text-xs" value={c.kind} onChange={(e) => set(i, { kind: e.target.value as 'level' | 'function' })} aria-label="Category type">
                <option value="level">Level / leadership</option><option value="function">Function</option>
              </select>
              <button onClick={() => move(i, -1)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Move up"><ArrowUp size={13} /></button>
              <button onClick={() => move(i, 1)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Move down"><ArrowDown size={13} /></button>
              <button onClick={() => onChange(cats.filter((_, j) => j !== i))} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Remove category"><X size={13} /></button>
            </div>
            <textarea key={`${i}-${c.keywords.join('|')}`} className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-700" rows={2} defaultValue={c.keywords.join(', ')}
              onBlur={(e) => set(i, { keywords: e.target.value.split(',').map((w) => w.trim()).filter(Boolean) })} aria-label={`Keywords for ${c.name}`} placeholder="Keywords or phrases, comma-separated" />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="secondary" className="!py-1.5 text-xs" onClick={() => onChange([...cats, { name: 'New category', kind: 'function', keywords: [] }])}><Plus size={13} />Add category</Button>
          <Button variant="secondary" className="!py-1.5 text-xs" onClick={() => onChange(DEFAULT_ASPIRATION_CATEGORIES)}><RotateCcw size={13} />Reset to default categories</Button>
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-amber-700">Unclassified aspiration texts in your data</div>
        {unclassified.length ? (
          <ul className="max-h-96 space-y-1 overflow-y-auto text-xs">
            {unclassified.map(([t, n]) => <li key={t} className="flex justify-between gap-2 rounded bg-slate-50 px-2 py-1"><span className="text-slate-700">{t}</span><span className="tabular-nums text-slate-400">{n}</span></li>)}
          </ul>
        ) : <p className="text-xs text-slate-400">{employees.length ? 'Every aspiration entry matches a category.' : 'Upload a dataset to see unclassified texts.'}</p>}
        <p className="mt-3 text-[11px] text-slate-500">Rules: categories are checked top to bottom and the first keyword match wins. Matching ignores case and punctuation, on whole words only. Different job titles are grouped only if you add their keywords. Cells with several entries (separated by new line, ";", "," or "|") are analysed per entry. Blank, N/A, #N/A and "-" count as no aspiration.</p>
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
        <div className="mb-3"><Note>Default rule: for the Yes/No talent and calibration flags, "Yes" is ranked above "No". Classification hierarchies (Cluster, Category) are left empty until you define them.</Note></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {RANK_DIMENSIONS.map((d) => (
            <RankEditor key={d.key} dim={d.key} values={valuesFor(employees, d.key)} order={draft.ranks[d.key]} onChange={(o) => setDraft({ ...draft, ranks: { ...draft.ranks, [d.key]: o } })} />
          ))}
        </div>
      </Section>

      <Section title="Employee Aspiration Alignment — approved rules" subtitle="Final, approved business rules. Read-only: they cannot be changed from the application." png={false}>
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <table className="min-w-full overflow-hidden rounded-lg border border-slate-200 text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">No.</th><th className="px-3 text-left">Employee Aspiration Category</th><th className="px-3 text-left">Classification</th><th className="px-3 text-right">Point</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {APPROVED_CATEGORIES.map((c) => <tr key={c.no}><td className="px-3 py-1.5 tabular-nums text-slate-400">{c.no}</td><td className="px-3 text-navy-900">{c.name}</td><td className="px-3">{c.classification}</td><td className="px-3 text-right font-semibold tabular-nums">{c.point}</td></tr>)}
              </tbody>
            </table>
            <div className="mt-4 text-[11px] font-medium uppercase tracking-wide text-slate-500">Approved aliases (source label → approved category)</div>
            <table className="mt-1 min-w-full overflow-hidden rounded-lg border border-slate-200 text-xs">
              <tbody className="divide-y divide-slate-100">
                {Object.entries(APPROVED_ALIASES).map(([a, n]) => { const c = APPROVED_CATEGORIES.find((x) => x.name === n)!; return <tr key={a}><td className="px-3 py-1.5 text-navy-900">{a}</td><td className="px-3 text-slate-400">→</td><td className="px-3">{n}</td><td className="px-3 text-right font-semibold tabular-nums">{c.point}</td></tr>; })}
              </tbody>
            </table>
            <p className="mt-2 text-[11px] text-slate-500">Matching: an exact approved name or an approved alias (ignoring case and extra spaces). No partial or similar-wording matching. Other values are UNMAPPED and never scored.</p>
          </div>
          <div className="space-y-3 text-xs">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="font-semibold text-navy-900">Weighting</div>
              <div className="mt-1 text-slate-600">Short-Term (CONV-Short Term Aspiration, col AT): <b>{SHORT_TERM_WEIGHT * 100}%</b><br />Long-Term (CONV-Long Term Aspiration, col AV): <b>{LONG_TERM_WEIGHT * 100}%</b></div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="font-semibold text-navy-900">Formula</div>
              <div className="mt-1 font-mono text-slate-700">((ST × 70%) + (LT × 30%)) / 3 × 100%</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="font-semibold text-navy-900">Classification (unrounded score)</div>
              <div className="mt-1 text-slate-600">HIGH ≥ {HIGH_THRESHOLD}% · MEDIUM ≥ {MEDIUM_THRESHOLD}% and &lt; {HIGH_THRESHOLD}% · LOW &lt; {MEDIUM_THRESHOLD}%</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-slate-600"><div className="font-semibold text-navy-900">Missing data</div>Both aspirations are required. No partial score, no weight redistribution, no default points.</div>
            <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><Lock size={12} />Changing these rules requires a code change and formal approval.</p>
          </div>
        </div>
        {(() => {
          const um = new Map<string, number>();
          for (const e of employees) { const a = evaluateEmployeeAlignment(e.v.shortTermAspiration, e.v.longTermAspiration); for (const s of [a.shortTerm, a.longTerm]) if (s.status === 'unmapped') um.set(s.original, (um.get(s.original) || 0) + 1); }
          const list = [...um.entries()].sort((a, b) => b[1] - a[1]);
          return (
            <div className="mt-5">
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-amber-700">Unmapped values in the current dataset (review list)</div>
              {list.length ? <ul className="grid gap-1 text-xs md:grid-cols-2 xl:grid-cols-3">{list.map(([v, n]) => <li key={v} className="flex justify-between rounded bg-slate-50 px-2 py-1"><span>"{v}"</span><span className="tabular-nums text-slate-400">{n}</span></li>)}</ul>
                : <p className="text-xs text-slate-400">{employees.length ? 'None. Every aspiration value matches an approved category.' : 'Upload a dataset to review unmapped values.'}</p>}
            </div>
          );
        })()}
      </Section>

      <Section title="Career aspiration categories" subtitle="Keyword rules used to group CONV-Short / Long Term Aspiration text. The original text is always kept and shown alongside the category.">
        <AspirationEditor cats={draft.aspirationCategories} onChange={(c) => setDraft({ ...draft, aspirationCategories: c })} employees={employees} />
      </Section>

      <Section title="12 Box matrix mapping" subtitle="Default: standard 3 × 4 layout (Potential High/Medium/Low × Performance Low/Medium/High/Very High). Change any assignment or reset to the default.">
        <MatrixEditor dataValues={boxLabels} mx={draft.matrix} onChange={(m) => setDraft({ ...draft, matrix: m })} />
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
