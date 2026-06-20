/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSignIn = vi.fn();

vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/supabase/target/client", () => ({
  createTargetBrowserClient: () => ({
    auth: { signInWithPassword: mockSignIn },
  }),
}));

const messages = {
  connect: {
    title: "Connect",
    description: "Sign in to target",
    connect: "Connect",
    connected: "Connected",
  },
};

describe("ConnectForm", () => {
  it("when sign in succeeds, then navigates to connection", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    const { ConnectForm } = await import("../connect-form.js");

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ConnectForm
          connectionId="00000000-0000-4000-8000-000000000001"
          url="https://target.supabase.co"
          anonKey="anon"
        />
      </NextIntlClientProvider>,
    );

    await user.type(screen.getByLabelText("Email"), "target@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Connect" }));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: "target@example.com",
      password: "password123",
    });
    expect(mockPush).toHaveBeenCalledWith(
      "/00000000-0000-4000-8000-000000000001",
    );
  });
});
