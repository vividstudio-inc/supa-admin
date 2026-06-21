"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { ForeignKeyPreviewDialog } from "@/components/foreign-key/foreign-key-preview-dialog";
import type { ColumnMeta, ForeignKeyMeta } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type ForeignKeyCellProps = {
  value: unknown;
  label?: string;
  foreignKey: ForeignKeyMeta;
  referencedColumns: ColumnMeta[];
  client: SupabaseClient;
  connectionId: string;
  canPreview: boolean;
  className?: string;
};

export function ForeignKeyCell({
  value,
  label,
  foreignKey,
  referencedColumns,
  client,
  connectionId,
  canPreview,
  className,
}: ForeignKeyCellProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const stringValue =
    value === null || value === undefined ? "" : String(value);

  if (!stringValue) {
    return <span className={className} />;
  }

  const display = label && label !== stringValue ? label : stringValue;

  if (!canPreview) {
    return (
      <span className={cn("font-mono text-xs", className)} title={stringValue}>
        {display}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className={cn(
          "max-w-full truncate text-left font-mono text-xs text-primary underline-offset-4 hover:underline",
          className,
        )}
        title={stringValue}
        onClick={() => setPreviewOpen(true)}
      >
        {display}
      </button>
      <ForeignKeyPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        client={client}
        connectionId={connectionId}
        foreignKey={foreignKey}
        value={stringValue}
        referencedColumns={referencedColumns}
      />
    </>
  );
}
