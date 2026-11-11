// APPROVED aspiration category → point mapping. This is the ONLY authorised mapping for the alignment engine.
// Final business rule — do not edit without formal approval.
import type { ApprovedCategory } from '../types/aspirationAlignment';

export const APPROVED_CATEGORIES: readonly ApprovedCategory[] = Object.freeze([
  { no: 1, name: 'Career Opportunity', classification: 'High', point: 3 },
  { no: 2, name: 'Clarity & Clear Directions', classification: 'Medium', point: 2 },
  { no: 3, name: 'Development', classification: 'Medium', point: 2 },
  { no: 4, name: 'Employee Empowerment', classification: 'Medium', point: 2 },
  { no: 5, name: 'Employee Value Proposition', classification: 'Low', point: 1 },
  { no: 6, name: 'Infrastructure', classification: 'Low', point: 1 },
  { no: 7, name: 'Personal Needs', classification: 'Low', point: 1 },
  { no: 8, name: 'Purpose', classification: 'Medium', point: 2 },
  { no: 9, name: 'Recognition and Retention', classification: 'Low', point: 1 },
  { no: 10, name: 'Synergy Collaboration & Competent Personnel', classification: 'Medium', point: 2 },
].map((c) => Object.freeze(c as ApprovedCategory)));

/**
 * Matching key: case-insensitive, leading/trailing spaces removed, internal whitespace (incl. non-breaking) collapsed.
 * Deliberately NO partial / fuzzy matching, so unrelated categories can never be matched.
 */
export const categoryKey = (s: string) => s.replace(/[\s ]+/g, ' ').trim().toLowerCase();

const BY_KEY = new Map(APPROVED_CATEGORIES.map((c) => [categoryKey(c.name), c]));

/** Returns the approved category for an Excel value, or null when not recognised (UNMAPPED). */
export function matchApprovedCategory(value: string): ApprovedCategory | null {
  return BY_KEY.get(categoryKey(value)) ?? null;
}
