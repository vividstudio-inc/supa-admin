import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  className?: string;
};

export function MetricCard({ label, value, hint, className }: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card p-5 shadow-sm",
        className,
      )}
    >
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
