import React, { useEffect } from 'react';
import { X, Inbox } from 'lucide-react';

export const PALETTE = ['#0B1F3A', '#0F9490', '#5B7BA6', '#7FCFCB', '#2C4F80', '#B8C4D6', '#C9973B', '#8A5A83', '#3F8F5A', '#9AA5B1'];
export const C = { navy: '#0B1F3A', teal: '#0F9490', slate: '#64748B', amber: '#C9973B', red: '#B4443E', green: '#3F8F5A', grid: '#E5E9F0' };

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx('rounded-xl border border-slate-200 bg-white shadow-card', className)}>{children}</div>;
}

export function Section({ title, subtitle, action, children, className }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cx('p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

export function Kpi({ label, value, sub, icon, tone = 'navy', onClick }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode; tone?: 'navy' | 'teal' | 'amber' | 'red' | 'slate'; onClick?: () => void }) {
  const toneCls = { navy: 'bg-navy-900 text-white', teal: 'bg-teal-600 text-white', amber: 'bg-amber-500 text-white', red: 'bg-red-700 text-white', slate: 'bg-slate-500 text-white' }[tone];
  return (
    <Card className={cx('p-4', onClick && 'cursor-pointer transition hover:border-teal-500')}>
      <div onClick={onClick} className="flex items-start gap-3">
        {icon && <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', toneCls)}>{icon}</div>}
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-navy-900">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

export function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'teal' | 'navy' | 'amber' | 'red' | 'green' }) {
  const cls = {
    slate: 'bg-slate-100 text-slate-700', teal: 'bg-teal-50 text-teal-700 ring-1 ring-teal-100', navy: 'bg-navy-900 text-white',
    amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', red: 'bg-red-50 text-red-700 ring-1 ring-red-200', green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  }[tone];
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium', cls)}>{children}</span>;
}

export function Button({ variant = 'primary', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const cls = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800',
    secondary: 'border border-slate-300 bg-white text-navy-900 hover:bg-slate-50',
    ghost: 'text-navy-900 hover:bg-slate-100',
    danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  }[variant];
  return <button {...p} className={cx('inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50', cls, className)} />;
}

export function Select({ value, onChange, options, label, className, allLabel }: { value: string; onChange: (v: string) => void; options: (string | { value: string; label: string })[]; label?: string; className?: string; allLabel?: string }) {
  return (
    <label className={cx('flex min-w-0 flex-col gap-1', className)}>
      {label && <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 min-w-0 rounded-lg border border-slate-300 bg-white px-2 text-sm text-navy-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100">
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </label>
  );
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600">{icon || <Inbox size={22} />}</div>
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {text && <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, wide, footer }: { open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; wide?: boolean; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/50 p-2 sm:p-6" onMouseDown={onClose}>
      <div className={cx('my-auto w-full rounded-xl bg-white shadow-2xl', wide ? 'max-w-6xl' : 'max-w-3xl')} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-navy-900">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
      {label}
    </div>
  );
}

/** Horizontal bar list — compact, readable alternative to crowded bar charts. */
export function BarList({ data, total, onClick, color = C.teal, max = 12, valueFmt }: { data: { name: string; value: number }[]; total?: number; onClick?: (name: string) => void; color?: string; max?: number; valueFmt?: (v: number) => string }) {
  const rows = data.slice(0, max);
  const top = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-400">No data</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <button key={r.name} onClick={() => onClick?.(r.name)} disabled={!onClick} className="group block w-full text-left disabled:cursor-default">
          <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-slate-700 group-hover:text-navy-900" title={r.name}>{r.name}</span>
            <span className="shrink-0 tabular-nums text-slate-500">
              <span className="font-semibold text-navy-900">{valueFmt ? valueFmt(r.value) : r.value}</span>
              {total ? ` · ${((r.value / total) * 100).toFixed(1)}%` : ''}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full transition-all group-hover:opacity-80" style={{ width: `${(r.value / top) * 100}%`, background: color }} />
          </div>
        </button>
      ))}
      {data.length > max && <p className="pt-1 text-[11px] text-slate-400">+{data.length - max} more not shown</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-xs text-teal-800">{children}</div>;
}

/** Extract the category name from a Recharts click payload (Bar / Pie). */
export function clickName(d: unknown): string | undefined {
  const o = d as { name?: unknown; payload?: { name?: unknown } } | null;
  const n = o?.payload?.name ?? o?.name;
  return typeof n === 'string' ? n : undefined;
}
