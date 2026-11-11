// Employee Aspiration Alignment engine — APPROVED 70:30 MODEL (final business rules).
//   Score = ((ST × 70%) + (LT × 30%)) / 3 × 100%
//   HIGH ≥ 80 · MEDIUM ≥ 55 and < 80 · LOW < 55 — classified on the UNROUNDED score.
import type { AlignmentClass, AlignmentResult, AspirationSide, CategoryPoint, EmployeeAlignment } from '../types/aspirationAlignment';
import { matchApprovedCategory } from './aspirationCategoryMapping';
import { MISSING_TOKEN } from '../lib/model';

export const SHORT_TERM_WEIGHT = 0.7;
export const LONG_TERM_WEIGHT = 0.3;
export const MAX_CATEGORY_POINT = 3;
export const HIGH_THRESHOLD = 80;
export const MEDIUM_THRESHOLD = 55;
/** Tolerance only absorbs binary floating-point noise (e.g. 79.99999999999999 for an exact 80); it is far below 0.001. */
const EPS = 1e-9;

export const ALIGNMENT_CLASSES: AlignmentClass[] = ['HIGH ALIGNMENT', 'MEDIUM ALIGNMENT', 'LOW ALIGNMENT'];

export function classifyAlignment(rawScore: number): AlignmentClass {
  if (rawScore >= HIGH_THRESHOLD - EPS) return 'HIGH ALIGNMENT';
  if (rawScore >= MEDIUM_THRESHOLD - EPS) return 'MEDIUM ALIGNMENT';
  return 'LOW ALIGNMENT';
}

export const formatScore = (raw: number) => `${raw.toFixed(1)}%`;

/** The single authoritative calculation. */
export function calculateAspirationAlignment(shortTermPoint: CategoryPoint, longTermPoint: CategoryPoint): AlignmentResult {
  const shortTermWeightedPoint = shortTermPoint * SHORT_TERM_WEIGHT;
  const longTermWeightedPoint = longTermPoint * LONG_TERM_WEIGHT;
  const totalWeightedPoint = shortTermWeightedPoint + longTermWeightedPoint;
  const rawAlignmentScore = (totalWeightedPoint / MAX_CATEGORY_POINT) * 100;
  return {
    shortTermPoint, longTermPoint, shortTermWeightedPoint, longTermWeightedPoint, totalWeightedPoint,
    rawAlignmentScore,
    displayAlignmentScore: formatScore(rawAlignmentScore),
    alignmentClassification: classifyAlignment(rawAlignmentScore),
  };
}

function side(value: string): AspirationSide {
  const original = (value ?? '').trim();
  if (!original || MISSING_TOKEN.test(original)) return { original, status: 'missing', category: null };
  const category = matchApprovedCategory(original);
  return category ? { original, status: 'valid', category } : { original, status: 'unmapped', category: null };
}

/**
 * Evaluates one employee. No partial scores, no weight redistribution, no default points.
 * Precedence: both missing → NO ASPIRATION DATA; any unrecognised value → UNMAPPED CATEGORY; one missing → INCOMPLETE DATA.
 */
export function evaluateEmployeeAlignment(shortTermValue: string, longTermValue: string): EmployeeAlignment {
  const st = side(shortTermValue);
  const lt = side(longTermValue);
  if (st.status === 'missing' && lt.status === 'missing') return { shortTerm: st, longTerm: lt, status: 'NO ASPIRATION DATA', validation: 'No aspiration data', result: null };
  if (st.status === 'unmapped' || lt.status === 'unmapped') return { shortTerm: st, longTerm: lt, status: 'UNMAPPED CATEGORY', validation: 'Unmapped category', result: null };
  if (st.status === 'missing' || lt.status === 'missing') return { shortTerm: st, longTerm: lt, status: 'INCOMPLETE DATA', validation: 'Incomplete data', result: null };
  const result = calculateAspirationAlignment(st.category!.point, lt.category!.point);
  return { shortTerm: st, longTerm: lt, status: result.alignmentClassification, validation: 'Scored', result };
}

// ---- Aggregation ---------------------------------------------------------------------------

export interface AlignmentRow<E> { e: E; a: EmployeeAlignment }

export interface AlignmentSummary {
  total: number;           // total (filtered) population — denominator for coverage
  scored: number;          // scored population — denominator for HIGH/MEDIUM/LOW
  byClass: Record<AlignmentClass, number>;
  incomplete: number;
  unmapped: number;
  noData: number;
  averageScore: number | null;
}

export function summarize<E>(rows: AlignmentRow<E>[]): AlignmentSummary {
  const byClass: Record<AlignmentClass, number> = { 'HIGH ALIGNMENT': 0, 'MEDIUM ALIGNMENT': 0, 'LOW ALIGNMENT': 0 };
  let incomplete = 0, unmapped = 0, noData = 0, sum = 0, scored = 0;
  for (const { a } of rows) {
    if (a.result) { scored++; sum += a.result.rawAlignmentScore; byClass[a.result.alignmentClassification]++; }
    else if (a.status === 'INCOMPLETE DATA') incomplete++;
    else if (a.status === 'UNMAPPED CATEGORY') unmapped++;
    else noData++;
  }
  return { total: rows.length, scored, byClass, incomplete, unmapped, noData, averageScore: scored ? sum / scored : null };
}

export const pctOf = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : 'N/A');
