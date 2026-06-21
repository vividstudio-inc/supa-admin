"use client";

import { Table2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/patterns/empty-state";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/routing";
import type { ResolvedPermission } from "@/lib/types/database";

type ConnectionTableListProps = {
  connectionId: string;
  tables: ResolvedPermission[];
};

export function ConnectionTableList({
  connectionId,
  tables,
}: ConnectionTableListProps) {
  const t = useTranslations("connectionTables");
  const tRoles = useTranslations("roles");

  if (tables.length === 0) {
    return (
      <EmptyState
        icon={Table2}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <Button render={<Link href={`/${connectionId}/connect`} />}>
            {t("openConnect")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead>{tRoles("tableName")}</TableHead>
            <TableHead>{t("permissions")}</TableHead>
            <TableHead className="text-right">{t("action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tables.map((table, index) => (
            <TableRow
              key={table.table_name}
              className={index % 2 === 1 ? "bg-muted/10" : undefined}
            >
              <TableCell className="font-medium font-mono text-sm">
                {table.table_name}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {table.can_read ? (
                    <StatusBadge status="ready" label={tRoles("canRead")} />
                  ) : null}
                  {table.can_create ? (
                    <StatusBadge status="ready" label={tRoles("canCreate")} />
                  ) : null}
                  {table.can_update ? (
                    <StatusBadge status="ready" label={tRoles("canUpdate")} />
                  ) : null}
                  {table.can_delete ? (
                    <StatusBadge status="ready" label={tRoles("canDelete")} />
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link href={`/${connectionId}/${table.table_name}`} />
                  }
                >
                  {t("openTable")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
