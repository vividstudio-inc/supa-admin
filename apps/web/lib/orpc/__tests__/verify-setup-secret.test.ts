import { describe, expect, it } from "vitest";
import { verifySetupSecret } from "../verify-setup-secret.js";

const SECRET =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("verifySetupSecret", () => {
  it("when secret matches, then does not throw", () => {
    expect(() => verifySetupSecret(SECRET, SECRET)).not.toThrow();
  });

  it("when secret wrong, then throws FORBIDDEN", () => {
    expect(() => verifySetupSecret("wrong", SECRET)).toThrow(
      "Invalid setup secret",
    );
  });

  it("when secret length differs, then throws FORBIDDEN", () => {
    expect(() => verifySetupSecret("short", SECRET)).toThrow(
      "Invalid setup secret",
    );
  });
});
