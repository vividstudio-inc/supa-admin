"use client";

import { Textarea } from "@/components/ui/textarea";

type JsonEditorProps = {
  value: unknown;
  onChange: (value: string) => void;
};

export function JsonEditor({ value, onChange }: JsonEditorProps) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2);

  return (
    <Textarea
      className="font-mono text-xs min-h-[120px]"
      value={text}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
