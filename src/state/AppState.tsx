import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
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
  talentCluster: string;
  talent12Box: string;
  cLevel: string;
  reviewerName: string;
  year: YearView;
}

export const EMPTY_FILTERS: Filters = {
  companyName: '', businessUnit: '', directorateName: '', divisionName: '', departmentName: '',
  talentCategory: '', talentCluster: '', talent12Box: '', cLevel: '', reviewerName: '', year: 'current',
};

export const FILTER_FIELDS: { key: Exclude<keyof Filters, 'year'>; label: string }[] = [
  { key: 'companyName', label: 'Company' },
  { key: 'businessUnit', label: 'Business Unit' },
  { key: 'directorateName', label: 'Directorate' },
  { key: 'divisionName', label: 'Division' },
  { key: 'departmentName', label: 'Department' },
  { key: 'reviewerName', label: 'Reviewer' },
  { key: 'talentCategory', label: 'Talent Category' },
  { key: 'talentCluster', label: 'Talent Cluster' },
  { key: 'talent12Box', label: 'Talent Class 12 Box' },
  { key: 'cLevel', label: 'C-Level' },
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
  // Employee data lives in React memory only: never written to IndexedDB, localStorage or sessionStorage.
  // A page refresh or closing the tab clears it.
  const loading = false;
  const [raw, setRaw] = useState<RawDataset | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [config, setConfigState] = useState<AppConfig>(() => loadConfig());
  const [profile, openProfile] = useState<Employee | null>(null);
  const [list, openList] = useState<ListModalState | null>(null);


  const result = useMemo(() => (raw && mapping ? buildEmployees(raw, mapping) : null), [raw, mapping]);
  const employees = useMemo(() => result?.employees ?? [], [result]);

  const filtered = useMemo(() => {
    const active = FILTER_FIELDS.filter((f) => filters[f.key]);
    if (!active.length) return employees;
    return employees.filter((e) => active.every((f) => val(e, f.key) === filters[f.key]));
  }, [employees, filters]);

  const setConfig = useCallback((c: AppConfig) => { setConfigState(c); saveConfig(c); }, []);

  const commitDataset = useCallback(async (r: RawDataset, m: ColumnMapping) => {
    setRaw(r); setMapping(m); setFilters(EMPTY_FILTERS); openProfile(null); openList(null);
    return buildEmployees(r, m);
  }, []);

  const updateMapping = useCallback(async (m: ColumnMapping) => {
    setMapping(m);
  }, []);

  const clearDataset = useCallback(async () => {
    setRaw(null); setMapping(null); setFilters(EMPTY_FILTERS); openProfile(null); openList(null);
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
