import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import { FilterBar } from '../components/FilterBar';
import { CrossTabTable } from '../components/CrossTabTable';
import { Kpi, Section, PageHeader, Select, Note } from '../components/ui';
import { crossTab, fmtPct, val } from '../lib/analytics';
import { compareRank } from '../lib/config';
import { Employee } from '../lib/model';
import { FieldKey } from '../lib/fields';

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export default function CalibrationPage() {
  const { filtered: list, config, openList } = useApp();
  const [crossA, setCrossA] = useState<FieldKey>('talent12Box');
  const [crossB, setCrossB] = useState<FieldKey>('talentCategory');

  const stats = useMemo(() => {
    const both = (a: FieldKey, b: FieldKey) => list.filter((e) => e.v[a] && e.v[b]);
    const cyPair = both('talentCY', 'calibCY');
    const lyPair = both('talentLY', 'calibLY');
    const cyAgree = cyPair.filter((e) => same(e.v.talentCY, e.v.calibCY));
    const lyAgree = lyPair.filter((e) => same(e.v.talentLY, e.v.calibLY));
    const mv = (k: 'calib' | 'talent') => {
      const r: Record<string, Employee[]> = { Upgrade: [], Downgrade: [], Stable: [], Unranked: [], 'No data': [] };
      for (const e of list) r[compareRank(config.ranks[k], k === 'calib' ? e.v.calibLY : e.v.talentLY, k === 'calib' ? e.v.calibCY : e.v.talentCY)].push(e);
      return r;
    };
    return { cyPair, lyPair, cyAgree, lyAgree, calibMv: mv('calib'), talentMv: mv('talent') };
  }, [list, config]);

  const tTalent = useMemo(() => crossTab(list, (e) => val(e, 'talentLY'), (e) => val(e, 'talentCY'), config.ranks.talent, config.ranks.talent), [list, config]);
  const tCalib = useMemo(() => crossTab(list, (e) => val(e, 'calibLY'), (e) => val(e, 'calibCY'), config.ranks.calib, config.ranks.calib), [list, config]);
  const tCons = useMemo(() => crossTab(list, (e) => val(e, 'talentCY'), (e) => val(e, 'calibCY'), config.ranks.talent, config.ranks.calib), [list, config]);
  const tConsLY = useMemo(() => crossTab(list, (e) => val(e, 'talentLY'), (e) => val(e, 'calibLY'), config.ranks.talent, config.ranks.calib), [list, config]);
  const rankFor = (k: FieldKey) => (k === 'talent12Box' ? config.ranks.talent12Box : k === 'talentCluster' ? config.ranks.talentCluster : k === 'talentCategory' ? config.ranks.talentCategory : []);
  const tCross = useMemo(() => crossTab(list, (e) => val(e, crossA), (e) => val(e, crossB), rankFor(crossA), rankFor(crossB)), [list, crossA, crossB, config]);

  const dims: { value: FieldKey; label: string }[] = [
    { value: 'talent12Box', label: 'Talent Class 12 Box' }, { value: 'talentCluster', label: 'Talent Cluster' }, { value: 'talentCategory', label: 'Talent Category' },
    { value: 'tlClassCalibration', label: 'TL Class Calibration' }, { value: 'talentCY', label: 'Talent (Current year)' }, { value: 'calibCY', label: 'Talent Calib (Current year)' },
    { value: 'cLevel', label: 'C-Level' }, { value: 'companyName', label: 'Company' },
  ];
  const cm = stats.calibMv;
  const open = (title: string, employees: Employee[]) => openList({ title, employees });

  return (
    <div>
      <PageHeader title="Talent Calibration Analytics" subtitle="Talent nomination vs calibration outcome, year-on-year transitions and classification consistency" />
      <FilterBar showYear={false} />
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Calibration consistency (CY)" value={fmtPct(stats.cyAgree.length, stats.cyPair.length)} sub={`${stats.cyAgree.length}/${stats.cyPair.length} Talent CY = Calib CY`} tone="teal" />
        <Kpi label="Calibration consistency (LY)" value={fmtPct(stats.lyAgree.length, stats.lyPair.length)} sub={`${stats.lyAgree.length}/${stats.lyPair.length} Talent LY = Calib LY`} />
        <Kpi label="Calibration changes (CY)" value={stats.cyPair.length - stats.cyAgree.length} sub="Calibration overrode nomination" tone="amber" onClick={() => open('Calibration changed CY result', stats.cyPair.filter((e) => !same(e.v.talentCY, e.v.calibCY)))} />
        <Kpi label="Calibrated upgrade" value={cm.Upgrade.length} sub="Calib LY → CY" tone="teal" onClick={() => open('Calibration upgrade (LY → CY)', cm.Upgrade)} />
        <Kpi label="Calibrated downgrade" value={cm.Downgrade.length} sub="Calib LY → CY" tone="red" onClick={() => open('Calibration downgrade (LY → CY)', cm.Downgrade)} />
        <Kpi label="Calibration retained" value={cm.Stable.length} sub={`${cm['No data'].length} without both years`} onClick={() => open('Calibration unchanged (LY → CY)', cm.Stable)} />
      </div>
      {(cm.Unranked.length > 0 || stats.talentMv.Unranked.length > 0) && (
        <div className="mb-5"><Note>{cm.Unranked.length + stats.talentMv.Unranked.length} transitions involve values not ranked in Mapping & Rules, so they are not counted as upgrades or downgrades.</Note></div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Talent transition matrix" subtitle="Talent (Last year) → Talent (Current year). Click a cell for employees.">
          <CrossTabTable tab={tTalent} rowTitle="Last year" colTitle="Current year" label="Talent" />
        </Section>
        <Section title="Calibration transition matrix" subtitle="Talent Calib (Last year) → Talent Calib (Current year)">
          <CrossTabTable tab={tCalib} rowTitle="Last year" colTitle="Current year" label="Calibration" />
        </Section>
        <Section title="Nomination vs calibration — current year" subtitle="Talent (Current year) vs Talent Calib (Current year). Off-diagonal = calibration changed the outcome.">
          <CrossTabTable tab={tCons} rowTitle="Talent CY" colTitle="Calib CY" label="CY consistency" />
        </Section>
        <Section title="Nomination vs calibration — last year" subtitle="Talent (Last year) vs Talent Calib (Last year)">
          <CrossTabTable tab={tConsLY} rowTitle="Talent LY" colTitle="Calib LY" label="LY consistency" />
        </Section>
      </div>

      <Section title="Classification cross-analysis" subtitle="Compare any two talent classifications (e.g. 12 Box vs Category) to check calibration consistency" className="mt-5"
        action={<div className="flex gap-2"><Select value={crossA} onChange={(v) => setCrossA(v as FieldKey)} options={dims} /><Select value={crossB} onChange={(v) => setCrossB(v as FieldKey)} options={dims} /></div>}>
        <CrossTabTable tab={tCross} rowTitle={dims.find((d) => d.value === crossA)!.label} colTitle={dims.find((d) => d.value === crossB)!.label} highlightDiagonal={false} />
      </Section>
    </div>
  );
}
