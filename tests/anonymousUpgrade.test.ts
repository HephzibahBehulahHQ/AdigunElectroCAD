import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ getUser: vi.fn(), updateUser: vi.fn() }));
vi.mock("../src/services/supabase", () => ({ supabaseClient: () => ({ auth }) }));
import { beginAnonymousUpgrade, finishAnonymousUpgrade } from "../src/services/auth";

describe("anonymous account upgrade", () => {
  beforeEach(() => vi.resetAllMocks());
  it("sends only the email during the first step", async () => {
    auth.updateUser.mockResolvedValue({ error: null });
    expect((await beginAnonymousUpgrade("test@example.com")).sent).toBe(true);
    expect(auth.updateUser).toHaveBeenCalledWith({ email: "test@example.com" });
  });
  it("rejects password setup before confirmation", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { is_anonymous: true } }, error: null });
    await expect(finishAnonymousUpgrade("test-password")).rejects.toThrow("Confirm your email");
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("sets the password after the confirmed session becomes permanent", async () => {
    const user = { id: "same-user", is_anonymous: false, email_confirmed_at: "2026-11-02" };
    auth.getUser.mockResolvedValue({ data: { user }, error: null });
    auth.updateUser.mockResolvedValue({ data: { user }, error: null });
    expect(await finishAnonymousUpgrade("test-password")).toEqual(user);
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "test-password" });
  });
});
