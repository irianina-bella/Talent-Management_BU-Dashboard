import type { AlignmentStatus } from '../../types/aspirationAlignment';
import { STATUS_STYLE } from './common';

export function StatusBadge({ status }: { status: AlignmentStatus }) {
  const s = STATUS_STYLE[status];
  return <span className="inline-flex whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: s.bg, color: s.fg }}>{status}</span>;
}
