import Link from 'next/link';

// Small admin UI kit: stat cards, status badges, and inline SVG charts
// (no external chart lib — keeps the bundle lean, spec §32).

export function StatCard({ label, value, sub, tone = 'default', href }: { label: string; value: string | number; sub?: string; tone?: 'default' | 'brand' | 'green' | 'amber' | 'red'; href?: string }) {
  const tones: Record<string, string> = {
    default: 'border-[var(--border)]',
    brand: 'border-brand/40',
    green: 'border-green-500/40',
    amber: 'border-amber-500/40',
    red: 'border-red-500/40',
  };
  const inner = (
    <div className={`card border-l-4 p-4 ${tones[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-soft)]">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--text-soft)]">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

const BADGE_TONES: Record<string, string> = {
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  PROCESSED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
  SCHEDULED: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  QUEUED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  DUPLICATE: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
  IMPORTED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function Badge({ status }: { status: string }) {
  const cls = BADGE_TONES[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${cls}`}>{status}</span>;
}

export function ScorePill({ label, value }: { label: string; value: number }) {
  const tone = value >= 80 ? 'text-green-600' : value >= 60 ? 'text-amber-600' : 'text-red-600';
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-[var(--text-soft)]">{label}</span>
      <span className={`font-bold ${tone}`}>{value}</span>
    </span>
  );
}

export function BarChart({ data, height = 140 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.label}: ${d.value}`}>
          <div className="w-full rounded-t bg-brand/80" style={{ height: `${(d.value / max) * (height - 24)}px` }} />
          <span className="truncate text-[9px] text-[var(--text-soft)]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function HBar({ data }: { data: { name: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-32 shrink-0 truncate text-[var(--text-soft)]">{d.name}</span>
          <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--bg)]">
            <div className="h-full rounded" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color || '#c8102e' }} />
          </div>
          <span className="w-8 text-right font-bold">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
