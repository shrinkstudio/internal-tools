import { Card, CardContent } from "@/components/ui/card";

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
    <Card>
      <CardContent>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">
          {value}
        </p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-text-dim">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
