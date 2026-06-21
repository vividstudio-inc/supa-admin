import type { ForeignKeyMeta } from "@supa-admin/projections";

const FK_TAG_PATTERN =
  /<fk\s+table=['"]([^'"]+)['"]\s+column=['"]([^'"]+)['"]\s*\/?>/i;

export function parseForeignKeyFromOpenApiDescription(
  description?: string,
): ForeignKeyMeta | null {
  if (!description) return null;

  const tagMatch = description.match(FK_TAG_PATTERN);
  if (tagMatch) {
    return { table: tagMatch[1]!, column: tagMatch[2]! };
  }

  const textMatch = description.match(
    /Foreign Key to [`']([^.`']+)\.([^.`']+)[`']/i,
  );
  if (textMatch) {
    return { table: textMatch[1]!, column: textMatch[2]! };
  }

  return null;
}
