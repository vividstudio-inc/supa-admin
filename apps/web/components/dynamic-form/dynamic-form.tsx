"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ForeignKeyField } from "@/components/foreign-key/foreign-key-field";
import { JsonEditor } from "@/components/json-editor/json-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ConnectionTableMeta } from "@/lib/foreign-key/utils";
import {
  type ColumnMeta,
  isBooleanColumn,
  isDateColumn,
  isJsonColumn,
  isNumericColumn,
  type ResolvedPermission,
} from "@/lib/types/database";

type DynamicFormProps = {
  columns: ColumnMeta[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
  client?: SupabaseClient;
  allTables?: ConnectionTableMeta[];
  permissions?: ResolvedPermission[];
};

export function DynamicForm({
  columns,
  initialValues,
  onSubmit,
  onCancel,
  client,
  allTables = [],
  permissions = [],
}: DynamicFormProps) {
  const t = useTranslations("common");
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const col of columns) {
      init[col.name] = initialValues?.[col.name] ?? "";
    }
    return init;
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed: Record<string, unknown> = {};

    for (const col of columns) {
      const val = values[col.name];
      if (val === "" || val === undefined) {
        if (!col.is_nullable && !initialValues) continue;
        parsed[col.name] = null;
        continue;
      }

      if (isBooleanColumn(col.data_type)) {
        parsed[col.name] = Boolean(val);
      } else if (isNumericColumn(col.data_type)) {
        parsed[col.name] = Number(val);
      } else if (isJsonColumn(col.data_type)) {
        parsed[col.name] = typeof val === "string" ? JSON.parse(val) : val;
      } else {
        parsed[col.name] = val;
      }
    }

    onSubmit(parsed);
  }

  function setValue(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function renderField(col: ColumnMeta) {
    if (
      col.foreign_key &&
      client &&
      allTables.length > 0 &&
      permissions.length > 0
    ) {
      return (
        <ForeignKeyField
          column={col}
          foreignKey={col.foreign_key}
          value={values[col.name]}
          onChange={(next) => setValue(col.name, next)}
          client={client}
          allTables={allTables}
          permissions={permissions}
        />
      );
    }

    if (isBooleanColumn(col.data_type)) {
      return (
        <Switch
          checked={Boolean(values[col.name])}
          onCheckedChange={(v) => setValue(col.name, v)}
        />
      );
    }

    if (isJsonColumn(col.data_type)) {
      return (
        <JsonEditor
          value={values[col.name]}
          onChange={(v) => setValue(col.name, v)}
        />
      );
    }

    if (isDateColumn(col.data_type)) {
      return (
        <Input
          type="datetime-local"
          value={String(values[col.name] ?? "")}
          onChange={(e) => setValue(col.name, e.target.value)}
        />
      );
    }

    if (isNumericColumn(col.data_type)) {
      return (
        <Input
          type="number"
          value={String(values[col.name] ?? "")}
          onChange={(e) => setValue(col.name, e.target.value)}
        />
      );
    }

    return (
      <Input
        value={String(values[col.name] ?? "")}
        onChange={(e) => setValue(col.name, e.target.value)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {columns.map((col) => (
        <div
          key={col.name}
          className="space-y-2 rounded-lg border border-border/40 p-3"
        >
          <Label>
            {col.name}
            <span className="text-xs text-muted-foreground ml-2">
              {col.data_type}
            </span>
          </Label>
          {renderField(col)}
        </div>
      ))}

      <div className="flex gap-2 pt-4">
        <Button type="submit">{t("save")}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
