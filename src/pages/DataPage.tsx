import { useCallback, useMemo, useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Download, Trash2, RefreshCw, ArrowRight } from 'lucide-react';
import { useApp } from '../state/AppState';
import { parseFile, splitHeader, ACCEPTED, ParsedWorkbook } from '../lib/parse';
import { autoMap, ColumnMapping, FIELDS, headerLabels } from '../lib/fields';
import { buildEmployees, downloadText, ImportResult, issuesToCsv, RawDataset } from '../lib/model';
import { Button, Card, PageHeader, Section, Select, Spinner, Badge, Kpi, Note, cx } from '../components/ui';
import { MappingEditor } from '../components/MappingEditor';
import type { PageKey } from '../components/Layout';

type Stage = { kind: 'idle' } | { kind: 'parsing'; name: string } | { kind: 'review'; file: File; wb: ParsedWorkbook; sheet: string; raw: RawDataset; mapping: ColumnMapping };

export default function DataPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const { raw, result, commitDataset, clearDataset } = useApp();
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const prepare = (file: File, wb: ParsedWorkbook, sheet: string): Stage => {
    const { headerRow, headers, data } = splitHeader(wb.sheets[sheet] || []);
    const r: RawDataset = { fileName: file.name, sheetName: sheet, headerRow, importedAt: new Date().toISOString(), headers, rows: data };
    return { kind: 'review', file, wb, sheet, raw: r, mapping: autoMap(headers) };
  };

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setStage({ kind: 'parsing', name: file.name });
    try {
      const wb = await parseFile(file);
      const sheet = wb.sheetNames.find((n) => (wb.sheets[n] || []).length > 1) || wb.sheetNames[0];
      if (!sheet || !(wb.sheets[sheet] || []).length) throw new Error('The file contains no readable rows.');
      setStage(prepare(file, wb, sheet));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to read the file.');
      setStage({ kind: 'idle' });
    }
  }, []);

  const preview = useMemo(() => (stage.kind === 'review' ? buildEmployees(stage.raw, stage.mapping) : null), [stage]);

  const doImport = async () => {
    if (stage.kind !== 'review') return;
    await commitDataset({ ...stage.raw, importedAt: new Date().toISOString() }, stage.mapping);
    setStage({ kind: 'idle' });
  };

  return (
    <div>
      <PageHeader title="Data Import" subtitle="Upload the talent management Excel file. Files are parsed locally in your browser and kept in memory only — nothing is uploaded, stored or logged." />

      {stage.kind !== 'review' && (
        <Card className="mb-6 p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cx('flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition', drag ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-teal-500 hover:bg-slate-50')}
          >
            {stage.kind === 'parsing' ? <Spinner label={`Reading ${stage.name}…`} /> : (
              <>
                <UploadCloud size={36} className="mb-3 text-teal-600" />
                <div className="text-sm font-semibold text-navy-900">{raw ? 'Drop a file to replace the current dataset' : 'Drag & drop your Excel file here'}</div>
                <div className="mt-1 text-xs text-slate-500">or click to browse · {ACCEPTED.join(', ')} · up to 50 MB</div>
              </>
            )}
            <input ref={inputRef} type="file" accept={ACCEPTED.join(',')} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
          </div>
          {error && <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"><XCircle size={16} />{error}</div>}
        </Card>
      )}

      {stage.kind === 'review' && preview && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-teal-600" />
                <div>
                  <div className="text-sm font-semibold text-navy-900">{stage.file.name}</div>
                  <div className="text-xs text-slate-500">{stage.raw.rows.length.toLocaleString()} data rows · {stage.raw.headers.length} columns · header detected on row {stage.raw.headerRow + 1}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                {stage.wb.sheetNames.length > 1 && (
                  <Select label="Worksheet" value={stage.sheet} onChange={(s) => setStage(prepare(stage.file, stage.wb, s))} options={stage.wb.sheetNames} />
                )}
                <Button variant="secondary" onClick={() => setStage({ kind: 'idle' })}>Cancel</Button>
                <Button onClick={doImport} disabled={preview.missingRequiredColumns.length > 0 || preview.successRows === 0}>
                  Import {preview.successRows.toLocaleString()} employees <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          </Card>
          <ValidationSummary r={preview} fileName={stage.file.name} />
          <Section title="Column mapping" subtitle="Columns were matched automatically by their original Excel names. Duplicated headers (Scale, Score) are matched to the Year column that precedes them. Adjust any mapping below.">
            <MappingEditor headers={stage.raw.headers} mapping={stage.mapping} onChange={(m) => setStage({ ...stage, mapping: m })} />
          </Section>
          <Section title="Preview" subtitle="First 20 rows with original Excel column names">
            <PreviewTable headers={stage.raw.headers} rows={stage.raw.rows.slice(0, 20)} />
          </Section>
        </div>
      )}

      {stage.kind !== 'review' && raw && result && (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-teal-600" />
                <div>
                  <div className="text-sm font-semibold text-navy-900">Active dataset: {raw.fileName}</div>
                  <div className="text-xs text-slate-500">Sheet "{raw.sheetName}" · imported {new Date(raw.importedAt).toLocaleString()} · held in browser memory only — refreshing the page clears it</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => inputRef.current?.click()}><RefreshCw size={15} />Replace dataset</Button>
                {confirmClear ? (
                  <>
                    <Button variant="danger" onClick={async () => { await clearDataset(); setConfirmClear(false); }}><Trash2 size={15} />Confirm clear</Button>
                    <Button variant="ghost" onClick={() => setConfirmClear(false)}>Keep</Button>
                  </>
                ) : <Button variant="danger" onClick={() => setConfirmClear(true)}><Trash2 size={15} />Clear dataset</Button>}
                <Button onClick={() => navigate('overview')}>Open dashboard <ArrowRight size={15} /></Button>
              </div>
            </div>
          </Card>
          <ValidationSummary r={result} fileName={raw.fileName} />
        </div>
      )}

      {stage.kind === 'idle' && !raw && (
        <Note>
          Expected columns include Personnel Number, Employee Name, Company Name, Talent (Last/Current year), Talent Calib (Last/Current year), Year -1/-2/-3 with Scale and Score, Talent Class 12 Box Text, Talent Cluster Text, Talent Category and C-Level.
          Only Personnel Number and Employee Name are required; any other unavailable field is shown as N/A. Source files are never modified.
        </Note>
      )}
    </div>
  );
}

function ValidationSummary({ r, fileName }: { r: ImportResult; fileName: string }) {
  const errors = r.issues.filter((i) => i.severity === 'error');
  const warnings = r.issues.filter((i) => i.severity === 'warning');
  const missing = FIELDS.filter((f) => r.missingByField[f.key] > 0).map((f) => ({ f, n: r.missingByField[f.key] })).sort((a, b) => b.n - a.n);
  return (
    <div className="space-y-4">
      {r.missingRequiredColumns.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <div>Required column(s) not mapped: <b>{r.missingRequiredColumns.join(', ')}</b>. Map them below to continue.</div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Kpi label="Rows read" value={r.totalRows.toLocaleString()} sub={r.skippedEmptyRows ? `${r.skippedEmptyRows} blank rows skipped` : undefined} />
        <Kpi label="Imported" value={r.successRows.toLocaleString()} tone="teal" icon={<CheckCircle2 size={18} />} />
        <Kpi label="Failed" value={r.failedRows.toLocaleString()} tone="red" icon={<XCircle size={18} />} />
        <Kpi label="Duplicate IDs" value={r.duplicateIds.length.toLocaleString()} tone="amber" />
        <Kpi label="Warnings" value={warnings.length.toLocaleString()} tone="slate" icon={<AlertTriangle size={18} />} sub="invalid types / values" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Missing values by column" subtitle="Blank cells in mapped columns — displayed as N/A, never imputed">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {missing.map(({ f, n }) => (
                  <tr key={f.key}><td className="py-1.5 text-slate-700">{f.header}{f.anchor ? <span className="text-slate-400"> (after {f.anchor})</span> : ''}</td><td className="py-1.5 text-right tabular-nums">{n.toLocaleString()}</td><td className="w-24 py-1.5 pl-3 text-right tabular-nums text-slate-500">{((n / Math.max(1, r.successRows + r.failedRows)) * 100).toFixed(0)}%</td></tr>
                ))}
                {r.unmappedFields.map((k) => {
                  const f = FIELDS.find((x) => x.key === k)!;
                  return <tr key={k}><td className="py-1.5 text-slate-500">{f.header}{f.anchor ? ` (after ${f.anchor})` : ''}</td><td colSpan={2} className="py-1.5 text-right"><Badge tone="amber">Column not found</Badge></td></tr>;
                })}
                {!missing.length && !r.unmappedFields.length && <tr><td className="py-4 text-center text-slate-400">No missing values</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="Record issues" subtitle={`${errors.length} errors · ${warnings.length} warnings`}
          action={r.issues.length > 0 && <Button variant="secondary" className="!py-1.5 text-xs" onClick={() => downloadText(`error-report-${fileName.replace(/\.[^.]+$/, '')}.csv`, issuesToCsv(r.issues))}><Download size={14} />Error report</Button>}>
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="text-[11px] uppercase text-slate-500"><tr><th className="py-1 text-left">Row</th><th className="text-left">Personnel No.</th><th className="text-left">Column</th><th className="text-left">Issue</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {r.issues.slice(0, 200).map((i, k) => (
                  <tr key={k}>
                    <td className="py-1.5 tabular-nums">{i.row}</td><td>{i.personnelNumber || 'N/A'}</td><td>{i.field}</td>
                    <td className={i.severity === 'error' ? 'text-red-700' : 'text-amber-700'}>{i.message}{i.value ? <span className="text-slate-400"> · "{i.value}"</span> : ''}</td>
                  </tr>
                ))}
                {!r.issues.length && <tr><td colSpan={4} className="py-4 text-center text-slate-400">No issues found</td></tr>}
              </tbody>
            </table>
            {r.issues.length > 200 && <p className="pt-2 text-[11px] text-slate-400">Showing 200 of {r.issues.length}. Download the error report for the full list.</p>}
          </div>
        </Section>
      </div>
    </div>
  );
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const labels = headerLabels(headers);
  return (
    <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-xs">
        <thead className="sticky top-0 bg-slate-50">
          <tr>{labels.map((h, i) => <th key={i} className="whitespace-nowrap px-2 py-1.5 text-left font-medium text-slate-600">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="max-w-[200px] truncate whitespace-nowrap px-2 py-1 text-slate-700" title={c}>{c === '' ? <span className="text-slate-300">—</span> : c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
