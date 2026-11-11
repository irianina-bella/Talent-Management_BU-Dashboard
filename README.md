# Talent Analytics Compass

Enterprise talent analytics dashboard for HR Directors, CHROs, Talent Management and HRBPs. It turns the talent-management Excel export into executive talent insights. **Analytics only**: no recruitment, IJP, FitMatch, workflow or employee-profile database.

## Architecture

- **Stack:** React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · Recharts 2 · Lucide · SheetJS (xlsx) · html-to-image + jsPDF
- **No backend, no database.** Excel/CSV is parsed in the browser (Web Worker). Employee data is held **in React memory only**. It is never written to IndexedDB, localStorage or sessionStorage, and it is never sent to any server, AI service or analytics provider. A page refresh or **Clear dataset** removes it.
- `localStorage` stores only analytics *rules* (talent hierarchy order, 12-box grid positions). It stores no employee records.
- **Access control:** Vercel Deployment Protection (Vercel Authentication) on the project, so the URL alone is not enough to open the app.

```
src/
  lib/          fields (column mapping layer), parse (+ worker), model (validation), analytics, config (rules), summary (aggregated export), exporters
  state/        AppState — in-memory dataset, mapping, filters, rules, drill-down modals
  components/   Layout, FilterBar, EmployeeTable, CrossTabTable, MappingEditor, ProfileModal, ExportMenu, ui
  pages/        Overview, Distribution, Calibration, Matrix, Succession, Performance, Organization, Movement, Risk, Employees, Data, Settings
tests/          synthetic fixture generator + Playwright smoke test (no real employee data)
```

### Data handling rules
- Original Excel headers are preserved. Duplicated `Scale` / `Score` headers are resolved to the preceding `Year -1/-2/-3` column, and every mapping can be changed manually.
- Blank values are shown as **N/A**. Nothing is imputed, invented or reclassified.
- Talent hierarchy (for upgrade/downgrade) and 9/12-box positions exist only when configured in **Mapping & Rules**. The single default is `Yes` > `No` for the binary talent flags.
- Risk indicators are descriptive counts with user-set thresholds. There are no attrition or flight-risk predictions.

## Modules
Executive Overview · Talent Distribution · Talent Calibration · 9/12-Box Matrix · Succession · Performance History · Organization Talent · Talent Movement · Talent Risk Indicators · Employee drill-down (profile card PNG/PDF) · Data Import · Mapping & Rules.

Exports run on explicit user action only: an **Excel summary** of aggregated counts (no employee rows), **PDF** of the current page, and **PNG** of any panel.

## Employee Aspiration Alignment (approved 70:30 model)
- Source: `CONV-Short Term Aspiration` (col AT, 70%) and `CONV-Long Term Aspiration` (col AV, 30%).
- Points: the 10 approved categories in `src/analytics/aspirationCategoryMapping.ts` (High = 3, Medium = 2, Low = 1). Matching is exact, case-insensitive and ignores extra whitespace; anything else is UNMAPPED.
- Score: `((ST × 0.70) + (LT × 0.30)) / 3 × 100`, computed only in `calculateAspirationAlignment()` (`src/analytics/aspirationAlignment.ts`).
- Classes use the unrounded score: HIGH ≥ 80, MEDIUM ≥ 55, LOW < 55. Both aspirations are required: no partial scores and no weight redistribution.
- Acceptance tests: `npm run test:alignment`. They also run automatically at the start of `npm run build`, so a deployment fails if any test fails.

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build → dist/
node tests/make-fixture.mjs fixture.xlsx   # synthetic test workbook
```

## Deployment (Vercel)
Project `talent-analytics-compass` · Framework **Vite** · Build `npm run build` · Output `dist` · Install `npm install` · Root directory: repository root (where `package.json` lives). No environment variables are required.

Never commit employee Excel/CSV files. `.gitignore` blocks them.
