import { useRef, useState } from 'react';
import { FileImage, FileText } from 'lucide-react';
import { Modal, Button } from '../../components/ui';
import { display, type Employee } from '../../lib/model';
import type { EmployeeAlignment, AspirationSide } from '../../types/aspirationAlignment';
import { HIGH_THRESHOLD, MEDIUM_THRESHOLD } from '../../analytics/aspirationAlignment';
import { STATUS_STYLE } from './common';

const fmt2 = (n: number) => n.toFixed(2);

function SideBlock({ title, side, weight, weighted }: { title: string; side: AspirationSide; weight: string; weighted: number | null }) {
  const c = side.category;
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6">
      <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-teal-700">{title}</div>
      <div className="mt-2 min-h-[60px] text-[22px] font-semibold leading-tight text-navy-900">{side.original ? side.original : 'N/A'}</div>
      {side.status === 'unmapped' && <div className="text-[12px] font-semibold text-[#6B3F66]">UNMAPPED CATEGORY — not scored</div>}
      <div className="mt-auto grid grid-cols-4 gap-2 pt-4 text-center">
        {[['Classification', c ? c.classification : 'N/A'], ['Point', c ? String(c.point) : 'N/A'], ['Weight', weight], ['Weighted', weighted === null ? 'N/A' : fmt2(weighted)]].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-slate-50 py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{l}</div>
            <div className="mt-0.5 text-[20px] font-semibold text-navy-900">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 16:9 (1280×720) employee aspiration alignment card. */
export function AlignmentCardBody({ e, a, innerRef }: { e: Employee; a: EmployeeAlignment; innerRef?: React.Ref<HTMLDivElement> }) {
  const r = a.result;
  const tone = STATUS_STYLE[a.status];
  const st = a.shortTerm.category, lt = a.longTerm.category;
  return (
    <div ref={innerRef} style={{ width: 1280, height: 720, fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }} className="flex flex-col overflow-hidden bg-[#F5F7FA] text-navy-900">
      <div className="flex items-center justify-between bg-navy-900 px-12 py-6 text-white">
        <div>
          <div className="text-[12px] font-medium uppercase tracking-[0.22em] text-teal-100">Employee Aspiration Alignment</div>
          <div className="mt-1 text-[30px] font-semibold leading-tight">{display(e.v.employeeName)}</div>
          <div className="mt-1 text-[14px] text-slate-300">{display(e.v.positionName)} · {display(e.v.companyName)}</div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-right text-[12px]">
          <span className="text-slate-400">Personnel No.</span><span className="font-semibold">{display(e.v.personnelNumber)}</span>
          <span className="text-slate-400">Business Unit</span><span className="font-semibold">{display(e.v.businessUnit)}</span>
          <span className="text-slate-400">Directorate</span><span className="max-w-[260px] truncate font-semibold">{display(e.v.directorateName)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-teal-600" />
      <div className="grid flex-1 grid-cols-[1fr_1fr_1.05fr] gap-6 px-12 py-7">
        <SideBlock title="Short-Term Aspiration · 70%" side={a.shortTerm} weight="70%" weighted={r ? r.shortTermWeightedPoint : null} />
        <SideBlock title="Long-Term Aspiration · 30%" side={a.longTerm} weight="30%" weighted={r ? r.longTermWeightedPoint : null} />
        <div className="flex flex-col rounded-xl p-6" style={{ background: tone.bg }}>
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em]" style={{ color: tone.fg }}>Final Result</div>
          <div className="mt-1 text-[64px] font-bold leading-none tabular-nums" style={{ color: tone.fg }}>{r ? r.displayAlignmentScore : 'N/A'}</div>
          <div className="mt-2 inline-block self-start rounded-md px-2.5 py-1 text-[15px] font-bold text-white" style={{ background: tone.solid }}>{a.status}</div>
          <div className="mt-5 space-y-1.5 rounded-lg bg-white/80 p-4 font-mono text-[13px] leading-relaxed text-navy-900">
            {r && st && lt ? (
              <>
                <div>Short-Term: {st.classification} = {st.point} × 70% = <b>{fmt2(r.shortTermWeightedPoint)}</b></div>
                <div>Long-Term: {lt.classification} = {lt.point} × 30% = <b>{fmt2(r.longTermWeightedPoint)}</b></div>
                <div>Total Weighted Point: <b>{fmt2(r.totalWeightedPoint)}</b></div>
                <div>Score: {fmt2(r.totalWeightedPoint)} / 3 × 100 = <b>{r.displayAlignmentScore}</b></div>
              </>
            ) : (
              <div className="font-sans text-[13px]">No score: {a.status === 'UNMAPPED CATEGORY' ? 'an aspiration category is not in the approved mapping.' : a.status === 'INCOMPLETE DATA' ? 'both short- and long-term aspirations are required. Weights are never redistributed.' : 'no aspiration recorded.'}</div>
            )}
          </div>
          <div className="mt-auto pt-3 text-[11px] text-slate-500">HIGH ≥ {HIGH_THRESHOLD}% · MEDIUM ≥ {MEDIUM_THRESHOLD}% · LOW &lt; {MEDIUM_THRESHOLD}% (unrounded score)</div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-12 py-3 text-[11px] text-slate-400">
        <span>Talent Analytics Compass · Approved 70:30 Aspiration Alignment model · Confidential</span>
        <span>Score = ((ST × 70%) + (LT × 30%)) / 3 × 100%</span>
      </div>
    </div>
  );
}

export function AlignmentCardModal({ e, a, onClose }: { e: Employee; a: EmployeeAlignment; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const base = `aspiration-alignment-${e.v.personnelNumber}`.replace(/[^a-z0-9-_]/gi, '_');
  const exportAs = async (kind: 'png' | 'pdf') => {
    if (!ref.current) return;
    setBusy(kind); setErr(null);
    try {
      const { toPng } = await import('html-to-image');
      const url = await toPng(ref.current, { pixelRatio: 2, width: 1280, height: 720, backgroundColor: '#ffffff', cacheBust: true });
      if (kind === 'png') { const l = document.createElement('a'); l.href = url; l.download = `${base}.png`; l.click(); }
      else {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1280, 720], hotfixes: ['px_scaling'] });
        pdf.addImage(url, 'PNG', 0, 0, 1280, 720);
        pdf.save(`${base}.pdf`);
      }
    } catch (x) { setErr(x instanceof Error ? x.message : 'Export failed'); } finally { setBusy(null); }
  };
  return (
    <Modal open wide onClose={onClose} title={`Aspiration Alignment · ${display(e.v.employeeName)}`} subtitle={`${display(e.v.personnelNumber)} · ${a.validation}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{err ? <span className="text-red-700">{err}</span> : 'Card format 16:9 (1280×720).'}</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!!busy} onClick={() => exportAs('png')}><FileImage size={15} />{busy === 'png' ? 'Exporting…' : 'Download PNG'}</Button>
            <Button disabled={!!busy} onClick={() => exportAs('pdf')}><FileText size={15} />{busy === 'pdf' ? 'Exporting…' : 'Download PDF'}</Button>
          </div>
        </div>
      }>
      <div className="overflow-hidden rounded-lg border border-slate-200" style={{ aspectRatio: '16 / 9' }}>
        <div className="origin-top-left" style={{ width: 1280, height: 720, transform: 'scale(var(--s))' }}
          ref={(el) => { if (el && el.parentElement) el.style.setProperty('--s', String(el.parentElement.clientWidth / 1280)); }}>
          <AlignmentCardBody e={e} a={a} innerRef={ref} />
        </div>
      </div>
    </Modal>
  );
}
