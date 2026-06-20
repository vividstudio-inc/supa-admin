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
    setup: {
      createAdmin: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

const messages = {
  setup: {
    title: "Setup",
    description: "Create admin",
    displayName: "Display name",
    setupSecret: "Setup secret",
    createAdmin: "Create admin",
    complete: "Complete",
  },
  auth: {
    email: "Email",
    password: "Password",
  },
};

describe("SetupForm", () => {
  it("when rendered, then shows required fields", async () => {
    const { SetupForm } = await import("../setup-form.js");
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SetupForm />
      </NextIntlClientProvider>,
    );
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Setup secret")).toBeInTheDocument();
  });

  it("when submitted with valid data, then calls createAdmin", async () => {
    const user = userEvent.setup();
    const { orpcBrowser } = await import("@/lib/orpc/client.browser");
    const { SetupForm } = await import("../setup-form.js");

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SetupForm />
      </NextIntlClientProvider>,
    );

    await user.type(screen.getByLabelText("Display name"), "Admin User");
    await user.type(screen.getByLabelText("Email"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(
      screen.getByLabelText("Setup secret"),
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );
    await user.click(screen.getByRole("button", { name: "Create admin" }));

    expect(orpcBrowser.setup.createAdmin).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "password123",
      displayName: "Admin User",
      setupSecret:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    });
  });
});
