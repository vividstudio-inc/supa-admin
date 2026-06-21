"use client";

import { sanitizePostgrestFilter } from "@supa-admin/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatRowLabel,
  getDisplayLabelColumn,
  getPrimaryKeyColumn,
} from "@/lib/foreign-key/utils";
import {
  type ColumnMeta,
  type ForeignKeyMeta,
  humanizeDbError,
  isTextColumn,
} from "@/lib/types/database";

const PAGE_SIZE = 10;

type ForeignKeySelectorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: SupabaseClient;
  foreignKey: ForeignKeyMeta;
  columns: ColumnMeta[];
  onSelect: (value: string) => void;
};

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ForeignKeySelectorDialog({
  open,
  onOpenChange,
  client,
  foreignKey,
  columns,
  onSelect,
}: ForeignKeySelectorDialogProps) {
  const t = useTranslations();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const textColumns = useMemo(
    () => columns.filter((c) => isTextColumn(c.data_type)),
    [columns],
  );
  const primaryKey = useMemo(
    () => getPrimaryKeyColumn(columns)?.name ?? foreignKey.column,
    [columns, foreignKey.column],
  );
  const displayColumns = useMemo(
    () => columns.filter((c) => !c.is_primary_key).slice(0, 4),
    [columns],
  );
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  useEffect(() => {
    if (!open) return;
    setPage(0);
    setSearch("");
    void loadRows(0, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, foreignKey.table]);

  async function loadRows(nextPage = page, nextSearch = search) {
    setLoading(true);
    let query = client.from(foreignKey.table).select("*", { count: "exact" });

    if (nextSearch && textColumns.length > 0) {
      const safeSearch = sanitizePostgrestFilter(nextSearch);
      const filters = textColumns
        .map((c) => `${c.name}.ilike.%${safeSearch}%`)
        .join(",");
      query = query.or(filters);
    }

    const from = nextPage * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count, error } = await query;
    setLoading(false);

    if (error) {
      const key = humanizeDbError(error);
      setRows([]);
      setTotal(0);
      if (["permissionDenied", "rlsViolation"].includes(key)) {
        return;
      }
      return;
    }

    setRows(data ?? []);
    setTotal(count ?? 0);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
    void loadRows(0, value);
  }

  function handleSelect(row: Record<string, unknown>) {
    const value = row[primaryKey];
    if (value == null) return;
    onSelect(String(value));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {t("table.selectForeignRow", { table: foreignKey.table })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />

          <div className="overflow-hidden rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>{primaryKey}</TableHead>
                  {displayColumns.map((col) => (
                    <TableHead key={col.name}>{col.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={displayColumns.length + 1}
                      className="text-center text-muted-foreground"
                    >
                      <Loader2 className="mx-auto size-4 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={displayColumns.length + 1}
                      className="text-center text-muted-foreground"
                    >
                      {t("table.noResults")}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow
                      key={`${row[primaryKey] ?? index}`}
                      className="cursor-pointer hover:bg-muted/20"
                      onClick={() => handleSelect(row)}
                    >
                      <TableCell className="font-mono text-xs max-w-[180px] truncate">
                        {formatCellValue(row[primaryKey])}
                      </TableCell>
                      {displayColumns.map((col) => (
                        <TableCell
                          key={col.name}
                          className="max-w-[180px] truncate"
                        >
                          {formatCellValue(row[col.name])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {total} {t("table.rows")}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0 || loading}
                onClick={() => {
                  const nextPage = page - 1;
                  setPage(nextPage);
                  void loadRows(nextPage, search);
                }}
              >
                <ChevronLeft className="mr-1 size-4" />
                {t("common.back")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("table.page")} {page + 1} {t("table.of")} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => {
                  const nextPage = page + 1;
                  setPage(nextPage);
                  void loadRows(nextPage, search);
                }}
              >
                {t("table.next")}
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function getForeignKeyFieldLabel(
  value: string,
  row: Record<string, unknown> | null,
  columns: ColumnMeta[],
): string {
  if (row) {
    const label = formatRowLabel(row, columns);
    if (label) return label;
  }
  return value;
}

export { getDisplayLabelColumn };
