"use client";

import { sanitizePostgrestFilter } from "@supa-admin/utils";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DynamicForm } from "@/components/dynamic-form/dynamic-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { createTargetBrowserClient } from "@/lib/supabase/target/client";
import {
  type ColumnMeta,
  humanizeDbError,
  isTextColumn,
  type TablePermission,
} from "@/lib/types/database";

type DataTableCrudProps = {
  connectionId: string;
  tableName: string;
  url: string;
  anonKey: string;
  columns: ColumnMeta[];
  permissions: TablePermission;
};

const PAGE_SIZE = 20;

export function DataTableCrud({
  connectionId: _connectionId,
  tableName,
  url,
  anonKey,
  columns,
  permissions,
}: DataTableCrudProps) {
  const t = useTranslations();
  const client = useMemo(
    () => createTargetBrowserClient(url, anonKey),
    [url, anonKey],
  );

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [deleteRow, setDeleteRow] = useState<Record<string, unknown> | null>(
    null,
  );

  const textColumns = columns.filter((c) => isTextColumn(c.data_type));

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData(
    nextPage = page,
    nextSearch = search,
    nextSortCol = sortCol,
    nextSortAsc = sortAsc,
  ) {
    setLoading(true);
    let query = client.from(tableName).select("*", { count: "exact" });

    if (nextSearch && textColumns.length > 0) {
      const safeSearch = sanitizePostgrestFilter(nextSearch);
      const filters = textColumns
        .map((c) => `${c.name}.ilike.%${safeSearch}%`)
        .join(",");
      query = query.or(filters);
    }

    const validSortCol =
      nextSortCol && columns.some((c) => c.name === nextSortCol)
        ? nextSortCol
        : null;

    if (validSortCol) {
      query = query.order(validSortCol, { ascending: nextSortAsc });
    }

    const from = nextPage * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count, error } = await query;
    setLoading(false);

    if (error) {
      const key = humanizeDbError(error);
      toast.error(
        ["permissionDenied", "rlsViolation", "duplicateKey"].includes(key)
          ? t(`errors.${key}` as "errors.permissionDenied")
          : key,
      );
      return;
    }

    setRows(data ?? []);
    setTotal(count ?? 0);
  }

  function toggleSort(col: string) {
    const asc = sortCol === col ? !sortAsc : true;
    setSortCol(col);
    setSortAsc(asc);
    setPage(0);
    void loadData(0, search, col, asc);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(0);
    void loadData(0, value, sortCol, sortAsc);
  }

  async function handleSave(values: Record<string, unknown>) {
    if (editRow) {
      const pk = columns.find((c) => c.is_primary_key)?.name ?? "id";
      const { error } = await client
        .from(tableName)
        .update(values)
        .eq(pk, editRow[pk] as string);
      if (error) {
        toast.error(
          t(`errors.${humanizeDbError(error)}` as "errors.permissionDenied"),
        );
        return;
      }
    } else {
      const { error } = await client.from(tableName).insert(values);
      if (error) {
        toast.error(
          t(`errors.${humanizeDbError(error)}` as "errors.permissionDenied"),
        );
        return;
      }
    }

    setFormOpen(false);
    setEditRow(null);
    void loadData();
    toast.success(t("common.success"));
  }

  async function handleDelete() {
    if (!deleteRow) return;
    const pk = columns.find((c) => c.is_primary_key)?.name ?? "id";
    const { error } = await client
      .from(tableName)
      .delete()
      .eq(pk, deleteRow[pk] as string);

    if (error) {
      toast.error(
        t(`errors.${humanizeDbError(error)}` as "errors.permissionDenied"),
      );
      return;
    }

    setDeleteRow(null);
    void loadData();
    toast.success(t("common.success"));
  }

  const displayColumns = columns.slice(0, 8);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder={t("common.search")}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
        {permissions.can_create && (
          <Button
            onClick={() => {
              setEditRow(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("table.createRow")}
          </Button>
        )}
      </div>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {displayColumns.map((col) => (
                <TableHead key={col.name}>
                  <button
                    type="button"
                    className="flex items-center gap-1 hover:underline"
                    onClick={() => toggleSort(col.name)}
                  >
                    {col.name}
                    {sortCol === col.name &&
                      (sortAsc ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      ))}
                  </button>
                </TableHead>
              ))}
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length + 1}>
                  {t("common.loading")}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={displayColumns.length + 1}>
                  {t("table.noData")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={i}>
                  {displayColumns.map((col) => (
                    <TableCell
                      key={col.name}
                      className="max-w-[200px] truncate"
                    >
                      {formatCell(row[col.name])}
                    </TableCell>
                  ))}
                  <TableCell className="space-x-1">
                    {permissions.can_update && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditRow(row);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {permissions.can_delete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteRow(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
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
            size="icon"
            disabled={page === 0}
            onClick={() => {
              const p = page - 1;
              setPage(p);
              void loadData(p);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {t("table.page")} {page + 1} {t("table.of")}{" "}
            {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages - 1}
            onClick={() => {
              const p = page + 1;
              setPage(p);
              void loadData(p);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {editRow ? t("table.editRow") : t("table.createRow")}
            </DialogTitle>
          </DialogHeader>
          <DynamicForm
            columns={columns}
            initialValues={editRow ?? undefined}
            onSubmit={handleSave}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRow} onOpenChange={() => setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("table.deleteRow")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("table.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
