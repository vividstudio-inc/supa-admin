import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: "ready" | "pending" | "error" | "warning";
  label: string;
  className?: string;
};

const variants: Record<
  StatusBadgeProps["status"],
  "secondary" | "destructive" | "outline" | "default"
> = {
  ready: "secondary",
  pending: "destructive",
  error: "destructive",
  warning: "outline",
};

const statusClasses: Record<StatusBadgeProps["status"], string> = {
  ready: "border-success/30 bg-success/10 text-success",
  pending: "",
  error: "",
  warning: "border-warning/40 bg-warning/10 text-warning-foreground",
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={variants[status]}
      className={cn(statusClasses[status], className)}
    >
      {label}
    </Badge>
  );
}
