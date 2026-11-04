import * as XLSX from 'xlsx';
import { detectHeaderRow } from './fields';

export interface ParsedWorkbook {
  sheetNames: string[];
  sheets: Record<string, string[][]>;
}

export const ACCEPTED = ['.xlsx', '.xls', '.csv'];
export const MAX_FILE_MB = 50;

/** Runs in either a worker or the main thread. All values read as formatted text to preserve source values. */
export function parseArrayBuffer(buf: ArrayBuffer, isCsv: boolean): ParsedWorkbook {
  const wb = isCsv
    ? XLSX.read(new TextDecoder('utf-8').decode(buf), { type: 'string', raw: true, dense: true })
    : XLSX.read(buf, { type: 'array', cellDates: false, dense: true });
  const sheets: Record<string, string[][]> = {};
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '', blankrows: false });
    sheets[name] = rows.map((r) => r.map((c) => (c === null || c === undefined ? '' : String(c))));
  }
  return { sheetNames: wb.SheetNames, sheets };
}

export async function parseFile(file: File): Promise<ParsedWorkbook> {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  if (!ACCEPTED.includes(ext)) throw new Error(`Unsupported file type "${ext}". Please upload .xlsx, .xls or .csv.`);
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`File is larger than ${MAX_FILE_MB} MB.`);
  const buf = await file.arrayBuffer();
  const isCsv = ext === '.csv';
  try {
    return await new Promise<ParsedWorkbook>((resolve, reject) => {
      const worker = new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' });
      const timer = setTimeout(() => { worker.terminate(); reject(new Error('timeout')); }, 120000);
      worker.onmessage = (e: MessageEvent<{ ok: boolean; data?: ParsedWorkbook; error?: string }>) => {
        clearTimeout(timer);
        worker.terminate();
        if (e.data.ok && e.data.data) resolve(e.data.data);
        else reject(new Error(e.data.error || 'Failed to parse file'));
      };
      worker.onerror = (err) => { clearTimeout(timer); worker.terminate(); reject(err); };
      worker.postMessage({ buf, isCsv }, [buf]);
    });
  } catch {
    // Fallback: parse on main thread (buffer may have been transferred, so re-read).
    const buf2 = await file.arrayBuffer();
    return parseArrayBuffer(buf2, isCsv);
  }
}

export function splitHeader(rows: string[][]): { headerRow: number; headers: string[]; data: string[][] } {
  const h = detectHeaderRow(rows);
  const headers = (rows[h] || []).map((c) => String(c).trim());
  const width = Math.max(headers.length, ...rows.slice(h + 1, h + 50).map((r) => r.length));
  while (headers.length < width) headers.push('');
  const data = rows.slice(h + 1).map((r) => {
    const out = r.slice(0, width);
    while (out.length < width) out.push('');
    return out;
  });
  return { headerRow: h, headers, data };
}
