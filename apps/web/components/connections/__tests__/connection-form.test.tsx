/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/orpc/client.browser", () => ({
  orpcBrowser: {
    connections: {
      create: vi.fn().mockResolvedValue({
        connection: {
          id: "c1",
          name: "Test",
          url: "https://x.co",
          schema_cached_at: null,
        },
        tableCount: 2,
      }),
    },
  },
}));

const messages = {
  connections: {
    add: "Add connection",
    formDescription: "Form description",
    sectionBasic: "Basic",
    sectionCredentials: "Credentials",
    grantHint: "Grant hint",
    name: "Name",
    url: "URL",
    anonKey: "Anon key",
    serviceRoleKey: "Service role key",
    testConnection: "Create",
    schemaSynced: "Synced {count} tables",
    bootstrap: { setupRequired: "Setup required" },
  },
};

describe("ConnectionForm", () => {
  it("when submitted, then calls connections.create", async () => {
    const user = userEvent.setup();
    const { orpcBrowser } = await import("@/lib/orpc/client.browser");
    const { ConnectionForm } = await import("../connection-form.js");

    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ConnectionForm />
      </NextIntlClientProvider>,
    );

    const inputs = container.querySelectorAll("input");
    await user.type(inputs[0]!, "My Project");
    await user.type(inputs[1]!, "https://abc.supabase.co");
    await user.type(inputs[2]!, "anon-key");
    await user.type(inputs[3]!, "service-key");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(orpcBrowser.connections.create).toHaveBeenCalledWith({
      name: "My Project",
      url: "https://abc.supabase.co",
      anonKey: "anon-key",
      serviceRoleKey: "service-key",
    });
    expect(mockPush).toHaveBeenCalledWith("/c1/setup");
  });
});
