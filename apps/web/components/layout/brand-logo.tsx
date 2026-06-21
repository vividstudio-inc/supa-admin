import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
};

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/15 ring-1 ring-brand/30">
        <div className="size-3 rounded-sm bg-brand" />
      </div>
      {!compact ? (
        <div className="min-w-0">
          <div className="truncate font-semibold tracking-tight">SupaAdmin</div>
          <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
            Admin Console
          </div>
        </div>
      ) : null}
    </div>
  );
}
