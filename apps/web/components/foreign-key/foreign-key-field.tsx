"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  ForeignKeySelectorDialog,
  getForeignKeyFieldLabel,
} from "@/components/foreign-key/foreign-key-selector-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type ConnectionTableMeta,
  canUseForeignKey,
  getTableMeta,
} from "@/lib/foreign-key/utils";
import type {
  ColumnMeta,
  ForeignKeyMeta,
  ResolvedPermission,
} from "@/lib/types/database";

type ForeignKeyFieldProps = {
  column: ColumnMeta;
  foreignKey: ForeignKeyMeta;
  value: unknown;
  onChange: (value: string) => void;
  client: SupabaseClient;
  allTables: ConnectionTableMeta[];
  permissions: ResolvedPermission[];
};

export function ForeignKeyField({
  column,
  foreignKey,
  value,
  onChange,
  client,
  allTables,
  permissions,
}: ForeignKeyFieldProps) {
  const t = useTranslations();
  const tCommon = useTranslations("common");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<Record<
    string,
    unknown
  > | null>(null);
  const stringValue =
    value === null || value === undefined ? "" : String(value);
  const referencedTable = getTableMeta(allTables, foreignKey.table);
  const referencedColumns = referencedTable?.columns ?? [];
  const canSelect = canUseForeignKey(foreignKey, permissions);

  useEffect(() => {
    if (!stringValue || !canSelect) {
      setSelectedRow(null);
      return;
    }

    let cancelled = false;
    void client
      .from(foreignKey.table)
      .select("*")
      .eq(foreignKey.column, stringValue)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSelectedRow(data);
      });

    return () => {
      cancelled = true;
    };
  }, [stringValue, canSelect, client, foreignKey.table, foreignKey.column]);

  const displayLabel = getForeignKeyFieldLabel(
    stringValue,
    selectedRow,
    referencedColumns,
  );

  if (!canSelect) {
    return (
      <div className="space-y-2">
        <Input
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
          placeholder={foreignKey.table}
        />
        <p className="text-xs text-muted-foreground">
          {t("table.foreignKeyNoAccess")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={displayLabel}
          readOnly
          placeholder={column.is_nullable ? "NULL" : undefined}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setSelectorOpen(true)}
        >
          <Search className="mr-2 size-4" />
          {t("table.selectForeignRowShort")}
        </Button>
        {column.is_nullable && stringValue ? (
          <Button type="button" variant="ghost" onClick={() => onChange("")}>
            {tCommon("cancel")}
          </Button>
        ) : null}
      </div>
      {stringValue ? (
        <p className="text-xs text-muted-foreground font-mono">{stringValue}</p>
      ) : null}

      {referencedColumns.length > 0 ? (
        <ForeignKeySelectorDialog
          open={selectorOpen}
          onOpenChange={setSelectorOpen}
          client={client}
          foreignKey={foreignKey}
          columns={referencedColumns}
          onSelect={onChange}
        />
      ) : null}
    </div>
  );
}
