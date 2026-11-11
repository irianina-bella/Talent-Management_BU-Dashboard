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

/**
 * EXPLICIT, business-approved aliases: source label → approved category name.
 * Only labels confirmed by the business owner are listed. Similar wording is NEVER matched automatically;
 * any label not listed here (and not an exact approved name) is UNMAPPED and not scored.
 */
export const APPROVED_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  // Approved by the business owner on 2026-11-11.
  'Career Growth & Mobility': 'Career Opportunity',
  'Learning & Development': 'Development',
  'Leadership Clarity & Direction': 'Clarity & Clear Directions',
  'Collaboration & Team Effectiveness': 'Synergy Collaboration & Competent Personnel',
  'Employee Experience & Value Proposition': 'Employee Value Proposition',
  'Recognition & Rewards': 'Recognition and Retention',
  'Workplace Resources & Enablement': 'Infrastructure',
});

const ALIAS_BY_KEY = new Map(Object.entries(APPROVED_ALIASES).map(([alias, name]) => {
  const target = BY_KEY.get(categoryKey(name));
  if (!target) throw new Error(`Alias "${alias}" points to unknown approved category "${name}"`);
  return [categoryKey(alias), target] as const;
}));

/** Returns the approved category for an Excel value (exact name, then explicit alias), or null when not recognised (UNMAPPED). */
export function matchApprovedCategory(value: string): ApprovedCategory | null {
  const k = categoryKey(value);
  return BY_KEY.get(k) ?? ALIAS_BY_KEY.get(k) ?? null;
}
