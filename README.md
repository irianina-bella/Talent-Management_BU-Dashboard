# Talent Intelligence Compass

Talent Intelligence & Calibration Analytics — a standalone, client-side web application for HR Directors, CHROs, Talent Management, HRBPs and Talent Councils.

## Architecture

- **Stack:** React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · Recharts 2 · Lucide icons · SheetJS (xlsx) · html-to-image + jsPDF
- **No backend, no database, no authentication.** Excel files are parsed in the browser (Web Worker) and stored only in the browser's IndexedDB. Nothing is uploaded to a server.
- **Data mapping layer** (`src/lib/fields.ts`): canonical fields ↔ original Excel headers. Duplicated `Scale` / `Score` headers are resolved positionally to the preceding `Year -1/-2/-3` column. Mapping is editable in the UI.
- **Validation** (`src/lib/model.ts`): required columns, duplicate Personnel Numbers, missing values, invalid numbers/durations, downloadable CSV error report.
- **Configurable rules** (`src/lib/config.ts`): talent hierarchy used for upgrade/downgrade, and 9/12-box grid positions. Nothing is assumed beyond Yes > No for the binary talent flags.

```
src/
  lib/          fields (mapping), parse (+worker), model (validation), analytics, config
  state/        AppState context (dataset, mapping, filters, config, modals)
  components/   Layout, FilterBar, EmployeeTable, CrossTabTable, MappingEditor, ProfileModal, ui
  pages/        Overview, Calibration, Matrix, Succession, Performance, Organization, Movement, Employees, Data, Settings
tests/          synthetic fixture generator + Playwright smoke test (no real employee data)
```

## Modules

Executive Overview · Talent Calibration (transition matrices, consistency) · 9/12 Box Matrix · Talent Profile (16:9 PNG/PDF card) · Succession · Performance History · Organization Talent · Talent Movement · Employee Directory · Data Import · Mapping & Rules.

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build to dist/
```

## Data privacy

- Never commit employee Excel/CSV files (blocked by `.gitignore`).
- The deployed site contains no employee data. Each user uploads their own file; data stays in their browser until they press **Clear dataset**.
- `noindex` and security headers are set in `vercel.json`.

## Deployment

Vercel project `talent-intelligence-compass` (framework preset: Vite, output `dist`). No environment variables are required.
