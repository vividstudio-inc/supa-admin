import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  className?: string;
  size?: "sm" | "md";
};

export function LoadingSpinner({
  className,
  size = "sm",
}: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn(
        "animate-spin",
        size === "sm" ? "size-4" : "size-5",
        className,
      )}
    />
  );
}
