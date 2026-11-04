import { parseArrayBuffer } from './parse';

self.onmessage = (e: MessageEvent<{ buf: ArrayBuffer; isCsv: boolean }>) => {
  try {
    const data = parseArrayBuffer(e.data.buf, e.data.isCsv);
    (self as unknown as Worker).postMessage({ ok: true, data });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
