// User-initiated exports only. Nothing is exported automatically.
import { toPng } from 'html-to-image';

const safe = (s: string) => s.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'export';
const stamp = () => new Date().toISOString().slice(0, 10);
const filter = (n: HTMLElement) => !(n instanceof HTMLElement && n.dataset && n.dataset.exportIgnore === 'true');

export async function exportNodePng(node: HTMLElement, name: string) {
  const url = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true, filter });
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe(name)}-${stamp()}.png`;
  a.click();
}

/** Multi-page A4 landscape PDF of a dashboard section. */
export async function exportNodePdf(node: HTMLElement, name: string, subtitle: string) {
  const { jsPDF } = await import('jspdf');
  const url = await toPng(node, { pixelRatio: 1.5, backgroundColor: '#ffffff', cacheBust: true, filter });
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('Image render failed')); img.src = url; });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 10, header = 14;
  const usableW = pw - margin * 2;
  const usableH = ph - margin - header - 8;
  const scale = usableW / img.width; // mm per px
  const sliceH = Math.floor(usableH / scale); // px per page
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  let page = 0;
  for (let y = 0; y < img.height; y += sliceH) {
    const h = Math.min(sliceH, img.height - y);
    canvas.width = img.width; canvas.height = h;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, y, img.width, h, 0, 0, img.width, h);
    if (page > 0) pdf.addPage();
    pdf.setFillColor(11, 31, 58); pdf.rect(0, 0, pw, header, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(11); pdf.text(`Talent Analytics Compass — ${name}`, margin, 9);
    pdf.setFontSize(8); pdf.text(subtitle, pw - margin, 9, { align: 'right' });
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, header + 4, usableW, h * scale);
    pdf.setTextColor(120, 130, 145); pdf.setFontSize(7);
    pdf.text(`Confidential · generated ${new Date().toLocaleString()} · page ${page + 1}`, margin, ph - 4);
    page++;
  }
  pdf.save(`${safe(name)}-${stamp()}.pdf`);
}

export async function exportWorkbook(sheets: { name: string; rows: (string | number | null)[][] }[], name: string) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    ws['!cols'] = (s.rows[0] || []).map((_, i) => ({ wch: Math.min(48, Math.max(10, ...s.rows.slice(0, 200).map((r) => String(r[i] ?? '').length + 2))) }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, `${safe(name)}-${stamp()}.xlsx`);
}
