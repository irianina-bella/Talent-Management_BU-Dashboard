import { useMemo } from 'react';
import { useApp } from '../../state/AppState';
import { evaluateEmployeeAlignment, type AlignmentRow } from '../../analytics/aspirationAlignment';
import type { AlignmentStatus } from '../../types/aspirationAlignment';
import type { Employee } from '../../lib/model';

export const STATUS_STYLE: Record<AlignmentStatus, { bg: string; fg: string; solid: string }> = {
  'HIGH ALIGNMENT': { bg: '#DCF2EA', fg: '#0B5E4A', solid: '#0F8A6C' },
  'MEDIUM ALIGNMENT': { bg: '#FBF0D9', fg: '#7A5A12', solid: '#C9973B' },
  'LOW ALIGNMENT': { bg: '#F8E1DF', fg: '#8A2A23', solid: '#B4443E' },
  'INCOMPLETE DATA': { bg: '#EEF2F6', fg: '#475569', solid: '#94A3B8' },
  'UNMAPPED CATEGORY': { bg: '#E7EBF0', fg: '#3F4A5A', solid: '#64748B' },
  'NO ASPIRATION DATA': { bg: '#F1F5F9', fg: '#64748B', solid: '#CBD5E1' },
};

/** Alignment for every employee in the current filtered population (scores never depend on the filter). */
export function useAlignmentRows(): AlignmentRow<Employee>[] {
  const { employees, filtered } = useApp();
  const byId = useMemo(() => new Map(employees.map((e) => [e.id, evaluateEmployeeAlignment(e.v.shortTermAspiration, e.v.longTermAspiration)])), [employees]);
  return useMemo(() => filtered.map((e) => ({ e, a: byId.get(e.id)! })), [filtered, byId]);
}
