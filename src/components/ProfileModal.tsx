import { useRef, useState } from 'react';
import { Download, FileImage, FileText, Star, ShieldAlert, Gem, UserCheck, TrendingDown } from 'lucide-react';
import { useApp } from '../state/AppState';
import { Employee, isSuccessor, isYes, display } from '../lib/model';
import { compareRank } from '../lib/config';
import { fmtNum, perfTrend } from '../lib/analytics';
import { Modal, Button, Badge } from './ui';
import { EmployeeTable } from './EmployeeTable';
import { FieldKey, FIELD_BY_KEY } from '../lib/fields';
import { parseEntries } from '../lib/aspiration';
import { evaluateEmployeeAlignment } from '../analytics/aspirationAlignment';

const d = (e: Employee, k: FieldKey) => display(e.v[k]);

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 py-1.5 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-navy-900">{value}</span>
    </div>
  );
}

function perfLine(e: Employee, n: 1 | 2 | 3) {
  const year = e.v[`y${n}Year` as FieldKey];
  const scale = e.v[`y${n}Scale` as FieldKey];
  const score = e.n[`y${n}Score` as 'y1Score'];
  return { year: display(year), scale: display(scale), score: score === null ? 'N/A' : String(score) };
}

/** 16:9 consultant-style profile card (1280×720) for PNG/PDF export. */
function ProfileCard({ e, innerRef }: { e: Employee; innerRef: React.Ref<HTMLDivElement> }) {
  const { config } = useApp();
  const move = compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY);
  const flags: { label: string; on: boolean }[] = [
    { label: 'Successor', on: isSuccessor(e.v.successor) },
    { label: 'Hidden Gem', on: isYes(e.v.hiddenGems) },
    { label: 'Free Rider', on: isYes(e.v.freeRider) },
    { label: 'Low Performer', on: isYes(e.v.lowPerformer) },
  ];
  const perf = [3, 2, 1].map((n) => perfLine(e, n as 1 | 2 | 3));
  return (
    <div ref={innerRef} style={{ width: 1280, height: 720, fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }} className="relative flex flex-col overflow-hidden bg-white text-navy-900">
      <div className="flex items-center justify-between bg-navy-900 px-12 py-7 text-white">
        <div>
          <div className="text-[13px] font-medium uppercase tracking-[0.2em] text-teal-100">Talent Profile</div>
          <div className="mt-1 text-[34px] font-semibold leading-tight">{d(e, 'employeeName')}</div>
          <div className="mt-1 text-[16px] text-slate-300">{d(e, 'positionName')} · {d(e, 'companyName')}</div>
        </div>
        <div className="text-right">
          <div className="text-[12px] uppercase tracking-wider text-slate-400">Personnel Number</div>
          <div className="text-[22px] font-semibold">{d(e, 'personnelNumber')}</div>
          <div className="mt-2 inline-block rounded-md bg-teal-600 px-3 py-1 text-[15px] font-semibold">{d(e, 'talent12Box')}</div>
        </div>
      </div>
      <div className="h-1.5 bg-teal-600" />
      <div className="grid flex-1 grid-cols-3 gap-8 px-12 py-7 text-[14px]">
        <div>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-teal-700">Organization</div>
          {([['Business Unit', 'businessUnit'], ['Directorate', 'directorateName'], ['Division', 'divisionName'], ['Department', 'departmentName'], ['Personnel Area', 'personnelArea'], ['C-Level', 'cLevel'], ['Yrs in Position', 'yrsInPos'], ['Yrs in Grade', 'yrsInGol'], ['Education', 'education']] as [string, FieldKey][]).map(([l, k]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-[5px]"><span className="text-slate-500">{l}</span><span className="text-right font-medium">{d(e, k)}</span></div>
          ))}
        </div>
        <div>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-teal-700">Talent Classification</div>
          {([['Talent (Last Year)', 'talentLY'], ['Talent (Current Year)', 'talentCY'], ['Calibration (Last Year)', 'calibLY'], ['Calibration (Current Year)', 'calibCY'], ['Talent Category', 'talentCategory'], ['Talent Cluster', 'talentCluster'], ['Reviewer', 'reviewerName']] as [string, FieldKey][]).map(([l, k]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-[5px]"><span className="text-slate-500">{l}</span><span className="text-right font-medium">{d(e, k)}</span></div>
          ))}
          <div className="flex justify-between gap-3 border-b border-slate-100 py-[5px]"><span className="text-slate-500">Talent Movement</span><span className="font-semibold text-teal-700">{move === 'No data' ? 'N/A' : move}</span></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {flags.map((f) => (
              <span key={f.label} className={f.on ? 'rounded-md bg-navy-900 px-2.5 py-1 text-[12px] font-semibold text-white' : 'rounded-md border border-slate-200 px-2.5 py-1 text-[12px] text-slate-400'}>{f.label}{f.on ? '' : ': No'}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-teal-700">Performance History</div>
          <div className="grid grid-cols-3 gap-2">
            {perf.map((p, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2.5 text-center">
                <div className="text-[11px] text-slate-500">{p.year}</div>
                <div className="text-[24px] font-semibold text-navy-900">{p.scale}</div>
                <div className="text-[11px] text-slate-500">Score {p.score}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between border-b border-slate-100 py-[5px]"><span className="text-slate-500">Average PAT</span><span className="font-medium">{fmtNum(e.n.avgPat)}</span></div>
          <div className="flex justify-between border-b border-slate-100 py-[5px]"><span className="text-slate-500">Trend</span><span className="font-medium">{perfTrend(e)}</span></div>
          <div className="mt-3 text-[12px] font-semibold uppercase tracking-wider text-teal-700">Strength</div>
          <p className="mt-1 line-clamp-3 text-[12.5px] leading-snug text-slate-700">{d(e, 'strength')}</p>
          <div className="mt-2 text-[12px] font-semibold uppercase tracking-wider text-teal-700">Development Area</div>
          <p className="mt-1 line-clamp-3 text-[12.5px] leading-snug text-slate-700">{d(e, 'weakness')}</p>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 px-12 py-3 text-[11px] text-slate-400">
        <span>Talent Analytics Compass · Confidential — for Talent Council use only</span>
        <span>Successor: {d(e, 'successor')} · Last change: {d(e, 'lastChange')}</span>
      </div>
    </div>
  );
}

export function ProfileModal() {
  const { profile: e, openProfile, config } = useApp();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!e) return null;
  const fileBase = `talent-profile-${e.v.personnelNumber}`.replace(/[^a-z0-9-_]/gi, '_');

  const exportAs = async (kind: 'png' | 'pdf') => {
    if (!cardRef.current) return;
    setBusy(kind); setErr(null);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, width: 1280, height: 720, backgroundColor: '#ffffff', cacheBust: true });
      if (kind === 'png') {
        const a = document.createElement('a');
        a.href = dataUrl; a.download = `${fileBase}.png`; a.click();
      } else {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1280, 720], hotfixes: ['px_scaling'] });
        pdf.addImage(dataUrl, 'PNG', 0, 0, 1280, 720);
        pdf.save(`${fileBase}.pdf`);
      }
    } catch (x) {
      setErr(x instanceof Error ? x.message : 'Export failed');
    } finally {
      setBusy(null);
    }
  };

  const move = compareRank(config.ranks.talent, e.v.talentLY, e.v.talentCY);
  const calMove = compareRank(config.ranks.calib, e.v.calibLY, e.v.calibCY);
  const field = (k: FieldKey) => <Row key={k} label={FIELD_BY_KEY[k].label} value={d(e, k)} />;

  return (
    <Modal open onClose={() => openProfile(null)} wide title={d(e, 'employeeName')} subtitle={`${d(e, 'personnelNumber')} · ${d(e, 'positionName')} · ${d(e, 'companyName')}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{err ? <span className="text-red-700">{err}</span> : 'Profile card exports in 16:9 (1280×720).'}</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!!busy} onClick={() => exportAs('png')}><FileImage size={15} />{busy === 'png' ? 'Exporting…' : 'Download PNG'}</Button>
            <Button disabled={!!busy} onClick={() => exportAs('pdf')}><FileText size={15} />{busy === 'pdf' ? 'Exporting…' : 'Download PDF'}</Button>
          </div>
        </div>
      }>
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="navy">{d(e, 'talent12Box')}</Badge>
        <Badge tone="teal">{d(e, 'talentCategory')}</Badge>
        <Badge>{d(e, 'talentCluster')}</Badge>
        {isSuccessor(e.v.successor) && <Badge tone="green"><UserCheck size={11} />Successor: {e.v.successor}</Badge>}
        {isYes(e.v.hiddenGems) && <Badge tone="teal"><Gem size={11} />Hidden Gem</Badge>}
        {isYes(e.v.freeRider) && <Badge tone="amber"><ShieldAlert size={11} />Free Rider</Badge>}
        {isYes(e.v.lowPerformer) && <Badge tone="red"><TrendingDown size={11} />Low Performer</Badge>}
        <Badge><Star size={11} />Talent movement: {move === 'No data' ? 'N/A' : move}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-teal-700">Employee</h4>
          {(['personnelNumber', 'employeeName', 'companyName', 'positionName', 'personnelArea', 'personnelSubarea', 'path', 'businessUnit', 'directorateName', 'divisionName', 'departmentName', 'cLevel'] as FieldKey[]).map(field)}
          <Row label="Current Level / Grade" value="N/A (no grade column in source)" />
          {(['yrsInPos', 'yrsInGol', 'education'] as FieldKey[]).map(field)}
        </div>
        <div>
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-teal-700">Talent</h4>
          {(['talentLY', 'talentCY', 'calibLY', 'calibCY'] as FieldKey[]).map(field)}
          <Row label="Calibration movement" value={calMove === 'No data' ? 'N/A' : calMove} />
          {(['tlClassCalibration', 'talent12Box', 'talentCluster', 'talentCategory', 'successor', 'hiddenGems', 'freeRider', 'lowPerformer', 'lowPerformerCategory', 'reviewerName', 'reviewerNik', 'lastChange'] as FieldKey[]).map(field)}
        </div>
        <div>
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-teal-700">Performance</h4>
          <Row label="Average PAT" value={fmtNum(e.n.avgPat)} />
          {[1, 2, 3].map((n) => {
            const p = perfLine(e, n as 1 | 2 | 3);
            return <Row key={n} label={`Year -${n} (${p.year})`} value={`Scale ${p.scale} · Score ${p.score}`} />;
          })}
          <Row label="Performance trend" value={perfTrend(e)} />
          <h4 className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wider text-teal-700">Strength</h4>
          <p className="whitespace-pre-line text-xs text-slate-700">{d(e, 'strength')}</p>
          <h4 className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wider text-teal-700">Weakness</h4>
          <p className="whitespace-pre-line text-xs text-slate-700">{d(e, 'weakness')}</p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">Career Aspiration</h4>
          {(() => { const al = evaluateEmployeeAlignment(e.v.shortTermAspiration, e.v.longTermAspiration); return (
            <span className="text-xs text-slate-600">Aspiration Alignment (70:30): <b className="text-navy-900">{al.result ? al.result.displayAlignmentScore : 'N/A'}</b> · <b>{al.status}</b></span>
          ); })()}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {([['Short-Term Aspiration', 'shortTermAspiration', 'shortTermOriginal'], ['Long-Term Aspiration', 'longTermAspiration', 'longTermOriginal']] as [string, FieldKey, FieldKey][]).map(([label, conv, orig]) => {
            const ents = parseEntries(e.v[conv], config.aspirationCategories);
            return (
              <div key={conv}>
                <div className="text-xs font-semibold text-navy-900">{label}</div>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{d(e, conv)}</p>
                {ents.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{ents.map((x, i) => <Badge key={i} tone={x.category === 'Other / Unclassified' ? 'amber' : 'teal'}>{x.category}{x.fn !== 'Other / Unclassified' && x.fn !== x.category ? ` · ${x.fn}` : ''}</Badge>)}</div>}
                {e.v[orig] && e.v[orig] !== e.v[conv] && <p className="mt-1.5 text-[11px] text-slate-400">Original ({FIELD_BY_KEY[orig].header}): {e.v[orig]}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-teal-700"><Download size={13} />Profile card preview (16:9)</div>
        <div className="overflow-hidden rounded-lg border border-slate-200" style={{ aspectRatio: '16 / 9' }}>
          <div className="origin-top-left" style={{ width: 1280, height: 720, transform: 'scale(var(--card-scale))' }} ref={(el) => {
            if (el && el.parentElement) {
              const s = el.parentElement.clientWidth / 1280;
              el.style.setProperty('--card-scale', String(s));
            }
          }}>
            <ProfileCard e={e} innerRef={cardRef} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function ListModal() {
  const { list, openList } = useApp();
  if (!list) return null;
  return (
    <Modal open wide onClose={() => openList(null)} title={list.title} subtitle={`${list.subtitle ? list.subtitle + ' · ' : ''}${list.employees.length} employees · click a row to open the profile`}>
      <ListBody />
    </Modal>
  );
}

function ListBody() {
  const { list } = useApp();
  return <EmployeeTable employees={list!.employees} pageSize={12} columns={list!.columns} trailing={list!.trailing} extraCols={[{ key: 'calibCY', label: 'Calib CY', flag: true }]} />;
}
