import { useState } from 'react';
import { FileSpreadsheet, FileDown } from 'lucide-react';
import { useApp, FILTER_FIELDS } from '../state/AppState';
import { Button } from './ui';

export function useFilterText() {
  const { filters } = useApp();
  return FILTER_FIELDS.filter((f) => filters[f.key]).map((f) => `${f.label}: ${filters[f.key]}`).join(' · ');
}

/** Header export actions. Exports aggregated summaries and on-screen dashboards only, on explicit user action. */
export function HeaderActions() {
  const { filtered, employees, config, filters } = useApp();
  const filterText = useFilterText();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!employees.length) return <span className="hidden text-xs text-slate-500 sm:block">Talent Analytics Compass</span>;

  const run = async (kind: 'xlsx' | 'pdf') => {
    setBusy(kind); setErr(null);
    try {
      const ex = await import('../lib/exporters');
      if (kind === 'xlsx') {
        const { buildSummary } = await import('../lib/summary');
        await ex.exportWorkbook(buildSummary(filtered, config, filters.year, filterText), 'talent-analytics-summary');
      } else {
        const node = document.getElementById('page-content');
        const title = document.querySelector('#page-content h1')?.textContent || 'Dashboard';
        if (node) await ex.exportNodePdf(node, title, `${filtered.length} employees${filterText ? ' · ' + filterText : ''}`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Export failed');
    } finally { setBusy(null); }
  };

  return (
    <div className="flex items-center gap-2">
      {err && <span className="text-xs text-red-700">{err}</span>}
      <Button variant="secondary" className="!px-2.5 !py-1.5 text-xs" disabled={!!busy} onClick={() => run('xlsx')} title="Aggregated counts only — no employee-level records">
        <FileSpreadsheet size={14} />{busy === 'xlsx' ? 'Exporting…' : 'Excel summary'}
      </Button>
      <Button variant="secondary" className="!px-2.5 !py-1.5 text-xs" disabled={!!busy} onClick={() => run('pdf')} title="PDF of the current dashboard page">
        <FileDown size={14} />{busy === 'pdf' ? 'Exporting…' : 'PDF'}
      </Button>
    </div>
  );
}
