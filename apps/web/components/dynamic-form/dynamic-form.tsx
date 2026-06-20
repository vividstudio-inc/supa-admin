"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { JsonEditor } from "@/components/json-editor/json-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  type ColumnMeta,
  isBooleanColumn,
  isDateColumn,
  isJsonColumn,
  isNumericColumn,
} from "@/lib/types/database";

type DynamicFormProps = {
  columns: ColumnMeta[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
};

export function DynamicForm({
  columns,
  initialValues,
  onSubmit,
  onCancel,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {columns.map((col) => (
        <div key={col.name} className="space-y-2">
          <Label>
            {col.name}
            <span className="text-xs text-muted-foreground ml-2">
              {col.data_type}
            </span>
          </Label>

          {isBooleanColumn(col.data_type) ? (
            <Switch
              checked={Boolean(values[col.name])}
              onCheckedChange={(v) => setValue(col.name, v)}
            />
          ) : isJsonColumn(col.data_type) ? (
            <JsonEditor
              value={values[col.name]}
              onChange={(v) => setValue(col.name, v)}
            />
          ) : isDateColumn(col.data_type) ? (
            <Input
              type="datetime-local"
              value={String(values[col.name] ?? "")}
              onChange={(e) => setValue(col.name, e.target.value)}
            />
          ) : isNumericColumn(col.data_type) ? (
            <Input
              type="number"
              value={String(values[col.name] ?? "")}
              onChange={(e) => setValue(col.name, e.target.value)}
            />
          ) : (
            <Input
              value={String(values[col.name] ?? "")}
              onChange={(e) => setValue(col.name, e.target.value)}
            />
          )}
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
