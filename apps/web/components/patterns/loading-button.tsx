"use client";

import type { ComponentProps } from "react";
import { LoadingSpinner } from "@/components/patterns/loading-spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LoadingButtonProps = ComponentProps<typeof Button> & {
  loading?: boolean;
  loadingText?: string;
};

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} className={cn(className)} {...props}>
      {loading ? (
        <>
          <LoadingSpinner />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
