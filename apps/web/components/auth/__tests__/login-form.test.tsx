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

vi.mock("@/lib/supabase/meta/client", () => ({
  createMetaBrowserClient: () => ({
    auth: { signInWithPassword: mockSignIn },
  }),
}));

const messages = {
  auth: {
    loginTitle: "Login",
    loginDescription: "Sign in",
    email: "Email",
    password: "Password",
    login: "Sign in",
    invalidCredentials: "Invalid credentials",
  },
};

describe("LoginForm", () => {
  it("when rendered, then shows email and password fields", async () => {
    const { LoginForm } = await import("../login-form.js");
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LoginForm />
      </NextIntlClientProvider>,
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("when sign in succeeds, then navigates home", async () => {
    mockSignIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    const { LoginForm } = await import("../login-form.js");

    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LoginForm />
      </NextIntlClientProvider>,
    );

    await user.type(screen.getByLabelText("Email"), "user@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "password123",
    });
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
