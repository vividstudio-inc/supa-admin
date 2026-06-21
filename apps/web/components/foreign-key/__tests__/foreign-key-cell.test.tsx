/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ForeignKeyCell } from "@/components/foreign-key/foreign-key-cell";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/foreign-key/foreign-key-preview-dialog", () => ({
  ForeignKeyPreviewDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="fk-preview">preview</div> : null,
}));

describe("ForeignKeyCell", () => {
  const foreignKey = { table: "posts", column: "id" };
  const referencedColumns = [
    {
      name: "id",
      data_type: "uuid",
      is_nullable: false,
      column_default: null,
      is_primary_key: true,
      is_identity: false,
    },
  ];

  it("when preview allowed, then opens preview dialog on click", async () => {
    const user = userEvent.setup();
    render(
      <ForeignKeyCell
        value="abc"
        label="Hello"
        foreignKey={foreignKey}
        referencedColumns={referencedColumns}
        client={{} as never}
        connectionId="conn-1"
        canPreview
      />,
    );

    await user.click(screen.getByRole("button"));
    expect(screen.getByTestId("fk-preview")).toBeInTheDocument();
  });

  it("when preview disallowed, then renders plain text", () => {
    render(
      <ForeignKeyCell
        value="abc"
        foreignKey={foreignKey}
        referencedColumns={referencedColumns}
        client={{} as never}
        connectionId="conn-1"
        canPreview={false}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("abc")).toBeInTheDocument();
  });
});
