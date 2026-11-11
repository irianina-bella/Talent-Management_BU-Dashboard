import { useState } from 'react';
import { LayoutDashboard, Scale, Grid3x3, Users, LineChart, Building2, ArrowLeftRight, Upload, Settings, Contact, Menu, X, Compass, Lock, PieChart, ShieldAlert, Target, Gauge } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '../state/AppState';
import { cx } from './ui';
import { HeaderActions } from './ExportMenu';

export type PageKey = 'overview' | 'distribution' | 'risk' | 'aspiration' | 'alignment' | 'calibration' | 'matrix' | 'succession' | 'performance' | 'organization' | 'movement' | 'employees' | 'data' | 'settings';

export const NAV: { key: PageKey; label: string; icon: LucideIcon; section: string }[] = [
  { key: 'overview', label: 'Executive Overview', icon: LayoutDashboard, section: 'Analytics' },
  { key: 'distribution', label: 'Talent Distribution', icon: PieChart, section: 'Analytics' },
  { key: 'calibration', label: 'Talent Calibration', icon: Scale, section: 'Analytics' },
  { key: 'matrix', label: 'Talent Matrix', icon: Grid3x3, section: 'Analytics' },
  { key: 'succession', label: 'Succession', icon: Users, section: 'Analytics' },
  { key: 'performance', label: 'Performance History', icon: LineChart, section: 'Analytics' },
  { key: 'organization', label: 'Organization Talent', icon: Building2, section: 'Analytics' },
  { key: 'movement', label: 'Talent Movement', icon: ArrowLeftRight, section: 'Analytics' },
  { key: 'risk', label: 'Talent Risk Indicators', icon: ShieldAlert, section: 'Analytics' },
  { key: 'aspiration', label: 'Career Aspiration Analytics', icon: Target, section: 'Analytics' },
  { key: 'alignment', label: 'Aspiration Alignment', icon: Gauge, section: 'Analytics' },
  { key: 'employees', label: 'Employee Directory', icon: Contact, section: 'Talent' },
  { key: 'data', label: 'Data Import', icon: Upload, section: 'Administration' },
  { key: 'settings', label: 'Mapping & Rules', icon: Settings, section: 'Administration' },
];

export function Layout({ page, setPage, children }: { page: PageKey; setPage: (p: PageKey) => void; children: React.ReactNode }) {
  const { raw, employees } = useApp();
  const [mobile, setMobile] = useState(false);
  const sections = [...new Set(NAV.map((n) => n.section))];

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600"><Compass size={20} className="text-white" /></div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">Talent Analytics</div>
          <div className="text-[11px] tracking-wide text-teal-100/80">Compass · HR Analytics</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {sections.map((s) => (
          <div key={s} className="mb-4">
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{s}</div>
            {NAV.filter((n) => n.section === s).map((n) => {
              const Icon = n.icon;
              return (
                <button key={n.key} onClick={() => { setPage(n.key); setMobile(false); }}
                  className={cx('mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition',
                    page === n.key ? 'bg-white/10 font-medium text-white ring-1 ring-white/10' : 'text-slate-300 hover:bg-white/5 hover:text-white')}>
                  <span className={page === n.key ? 'text-teal-500' : ''}><Icon size={16} /></span>{n.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 px-5 py-4 text-[11px] text-slate-400">
        {raw ? (
          <>
            <div className="truncate text-slate-200" title={raw.fileName}>{raw.fileName}</div>
            <div>{employees.length.toLocaleString()} employees · {new Date(raw.importedAt).toLocaleDateString()}</div>
          </>
        ) : <div>No dataset loaded</div>}
        <div className="mt-2 flex items-center gap-1.5 text-teal-100/70"><Lock size={11} />In-memory only · cleared on refresh</div>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-navy-900 lg:block">{nav}</aside>
      {mobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setMobile(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-navy-900">{nav}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-md p-1.5 text-navy-900 hover:bg-slate-100 lg:hidden" onClick={() => setMobile(!mobile)} aria-label="Menu">{mobile ? <X size={20} /> : <Menu size={20} />}</button>
            <span className="text-sm font-medium text-navy-900">{NAV.find((n) => n.key === page)?.label}</span>
          </div>
          <HeaderActions />
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
