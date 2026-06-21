import { Skeleton } from "@/components/ui/skeleton";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-4">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`head-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={`row-${row}`} className="flex gap-4">
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton key={`cell-${row}-${col}`} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
