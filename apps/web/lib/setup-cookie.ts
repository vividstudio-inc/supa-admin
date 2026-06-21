export const SA_SETUP_COOKIE = "sa_setup";

export const SA_SETUP_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

export function isSetupCookieSet(value: string | undefined): boolean {
  return value === "1";
}
