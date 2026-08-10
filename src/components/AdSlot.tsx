// Ad placeholder (spec §60). Provider-agnostic; renders a labelled slot that a
// real ad script can target by id. Non-intrusive by design.
export default function AdSlot({ id, label, className = '' }: { id: string; label: string; className?: string }) {
  return (
    <div
      id={`ad-${id}`}
      className={`grid place-items-center rounded border border-dashed border-[var(--border)] bg-[var(--surface)] py-6 text-center text-xs text-[var(--text-soft)] ${className}`}
      data-ad-slot={id}
    >
      <span>विज्ञापन · {label}</span>
    </div>
  );
}
