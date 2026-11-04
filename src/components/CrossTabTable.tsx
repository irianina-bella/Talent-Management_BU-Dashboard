import { CrossTab } from '../lib/analytics';
import { useApp } from '../state/AppState';
import { cx } from './ui';

/** Transition / cross-tab matrix with heat shading. Diagonal highlighted when rows and columns share values. */
export function CrossTabTable({ tab, rowTitle, colTitle, highlightDiagonal = true, label }: { tab: CrossTab; rowTitle: string; colTitle: string; highlightDiagonal?: boolean; label?: string }) {
  const { openList } = useApp();
  const max = Math.max(1, ...tab.rows.flatMap((r) => tab.cols.map((c) => tab.cells[r]?.[c]?.length || 0)));
  const total = tab.rows.reduce((s, r) => s + tab.cols.reduce((t, c) => t + (tab.cells[r]?.[c]?.length || 0), 0), 0);
  if (!tab.rows.length) return <p className="py-6 text-center text-sm text-slate-400">No data</p>;
  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-[11px] font-medium text-slate-500">{rowTitle} ↓ / {colTitle} →</th>
            {tab.cols.map((c) => <th key={c} className="max-w-[120px] px-2 py-1 text-center text-[11px] font-medium text-slate-600">{c}</th>)}
            <th className="px-2 py-1 text-center text-[11px] font-medium text-slate-500">Total</th>
          </tr>
        </thead>
        <tbody>
          {tab.rows.map((r) => {
            const rowTotal = tab.cols.reduce((t, c) => t + (tab.cells[r]?.[c]?.length || 0), 0);
            return (
              <tr key={r}>
                <th className="whitespace-nowrap px-2 py-1 text-left font-medium text-slate-700">{r}</th>
                {tab.cols.map((c) => {
                  const list = tab.cells[r]?.[c] || [];
                  const n = list.length;
                  const diag = highlightDiagonal && r.toLowerCase() === c.toLowerCase();
                  const alpha = n ? 0.1 + (n / max) * 0.8 : 0;
                  return (
                    <td key={c} className="p-0.5">
                      <button
                        disabled={!n}
                        onClick={() => openList({ title: `${label ? label + ': ' : ''}${r} → ${c}`, subtitle: `${rowTitle}: ${r} · ${colTitle}: ${c}`, employees: list })}
                        className={cx('flex h-11 w-full min-w-[64px] flex-col items-center justify-center rounded-md text-sm font-semibold tabular-nums transition hover:ring-2 hover:ring-teal-500 disabled:cursor-default disabled:hover:ring-0', diag && 'ring-1 ring-navy-900/40')}
                        style={{ background: n ? `rgba(15,148,144,${alpha})` : '#F8FAFC', color: alpha > 0.55 ? '#fff' : '#0B1F3A' }}
                      >
                        {n || '–'}
                        {n > 0 && <span className="text-[10px] font-normal opacity-80">{((n / total) * 100).toFixed(1)}%</span>}
                      </button>
                    </td>
                  );
                })}
                <td className="px-2 text-center font-semibold tabular-nums text-navy-900">{rowTotal}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
