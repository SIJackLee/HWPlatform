interface StatsCardProps {
  label: string;
  value: string | number;
  helper?: string;
}

export function StatsCard({ label, value, helper }: StatsCardProps) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
