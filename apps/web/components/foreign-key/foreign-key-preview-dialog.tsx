"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@/i18n/routing";
import { buildForeignKeyDetailHref } from "@/lib/foreign-key/utils";
import type { ColumnMeta, ForeignKeyMeta } from "@/lib/types/database";

type ForeignKeyPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: SupabaseClient;
  connectionId: string;
  foreignKey: ForeignKeyMeta;
  value: string;
  referencedColumns: ColumnMeta[];
};

function formatPreviewValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ForeignKeyPreviewDialog({
  open,
  onOpenChange,
  client,
  connectionId,
  foreignKey,
  value,
  referencedColumns,
}: ForeignKeyPreviewDialogProps) {
  const t = useTranslations();
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !value) {
      setRow(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void client
      .from(foreignKey.table)
      .select("*")
      .eq(foreignKey.column, value)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        setLoading(false);
        if (fetchError) {
          setError(fetchError.message);
          setRow(null);
          return;
        }
        setRow(data);
      });

    return () => {
      cancelled = true;
    };
  }, [open, value, client, foreignKey.table, foreignKey.column]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {t("table.foreignKeyPreview", { table: foreignKey.table })}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : row ? (
          <dl className="space-y-3">
            {referencedColumns.map((col) => (
              <div
                key={col.name}
                className="rounded-lg border border-border/40 p-3"
              >
                <dt className="text-xs text-muted-foreground">{col.name}</dt>
                <dd className="mt-1 break-all font-mono text-sm">
                  {formatPreviewValue(row[col.name])}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("table.noResults")}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            render={
              <Link
                href={buildForeignKeyDetailHref(
                  connectionId,
                  foreignKey,
                  value,
                )}
              />
            }
          >
            {t("table.viewDetail")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
