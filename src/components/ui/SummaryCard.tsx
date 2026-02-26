export function SummaryCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-text tabular-nums">
        {value}
      </p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-text-dim">{subtitle}</p>
      )}
    </div>
  );
}
