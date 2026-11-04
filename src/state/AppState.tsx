import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, set, del } from 'idb-keyval';
import { ColumnMapping } from '../lib/fields';
import { buildEmployees, Employee, ImportResult, RawDataset } from '../lib/model';
import { AppConfig, loadConfig, saveConfig } from '../lib/config';
import { YearView, val } from '../lib/analytics';

export interface Filters {
  companyName: string;
  businessUnit: string;
  directorateName: string;
  divisionName: string;
  departmentName: string;
  talentCategory: string;
  talent12Box: string;
  cLevel: string;
  reviewerName: string;
  year: YearView;
}

export const EMPTY_FILTERS: Filters = {
  companyName: '', businessUnit: '', directorateName: '', divisionName: '', departmentName: '',
  talentCategory: '', talent12Box: '', cLevel: '', reviewerName: '', year: 'current',
};

export const FILTER_FIELDS: { key: Exclude<keyof Filters, 'year'>; label: string }[] = [
  { key: 'companyName', label: 'Company' },
  { key: 'businessUnit', label: 'Business Unit' },
  { key: 'directorateName', label: 'Directorate' },
  { key: 'divisionName', label: 'Division' },
  { key: 'departmentName', label: 'Department' },
  { key: 'talentCategory', label: 'Talent Category' },
  { key: 'talent12Box', label: 'Talent Class' },
  { key: 'cLevel', label: 'C-Level' },
  { key: 'reviewerName', label: 'Reviewer' },
];

export interface ListModalState { title: string; subtitle?: string; employees: Employee[]; }

interface Ctx {
  loading: boolean;
  raw: RawDataset | null;
  mapping: ColumnMapping | null;
  result: ImportResult | null;
  employees: Employee[];
  filtered: Employee[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  commitDataset: (raw: RawDataset, mapping: ColumnMapping) => Promise<ImportResult>;
  updateMapping: (m: ColumnMapping) => Promise<void>;
  clearDataset: () => Promise<void>;
  profile: Employee | null;
  openProfile: (e: Employee | null) => void;
  list: ListModalState | null;
  openList: (l: ListModalState | null) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<RawDataset | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [config, setConfigState] = useState<AppConfig>(() => loadConfig());
  const [profile, openProfile] = useState<Employee | null>(null);
  const [list, openList] = useState<ListModalState | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [r, m] = await Promise.all([get<RawDataset>('tic.raw'), get<ColumnMapping>('tic.mapping')]);
        if (r && m) { setRaw(r); setMapping(m); }
      } catch { /* IndexedDB unavailable: session-only mode */ }
      setLoading(false);
    })();
  }, []);

  const result = useMemo(() => (raw && mapping ? buildEmployees(raw, mapping) : null), [raw, mapping]);
  const employees = useMemo(() => result?.employees ?? [], [result]);

  const filtered = useMemo(() => {
    const active = FILTER_FIELDS.filter((f) => filters[f.key]);
    if (!active.length) return employees;
    return employees.filter((e) => active.every((f) => val(e, f.key) === filters[f.key]));
  }, [employees, filters]);

  const setConfig = useCallback((c: AppConfig) => { setConfigState(c); saveConfig(c); }, []);

  const commitDataset = useCallback(async (r: RawDataset, m: ColumnMapping) => {
    setRaw(r); setMapping(m); setFilters(EMPTY_FILTERS);
    try { await Promise.all([set('tic.raw', r), set('tic.mapping', m)]); } catch { /* ignore */ }
    return buildEmployees(r, m);
  }, []);

  const updateMapping = useCallback(async (m: ColumnMapping) => {
    setMapping(m);
    try { await set('tic.mapping', m); } catch { /* ignore */ }
  }, []);

  const clearDataset = useCallback(async () => {
    setRaw(null); setMapping(null); setFilters(EMPTY_FILTERS); openProfile(null); openList(null);
    try { await Promise.all([del('tic.raw'), del('tic.mapping')]); } catch { /* ignore */ }
  }, []);

  const value: Ctx = {
    loading, raw, mapping, result, employees, filtered, filters, setFilters, config, setConfig,
    commitDataset, updateMapping, clearDataset, profile, openProfile, list, openList,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}
