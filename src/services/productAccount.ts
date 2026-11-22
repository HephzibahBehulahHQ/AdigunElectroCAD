
import { supabaseClient } from "./supabase";

type AccountResult = { step: string; error?: string; remainingMs?: number; session?: {access_token: string; refresh_token: string} };

export async function accountRequest(body: object): Promise<AccountResult> {
  const response = await fetch("/api/account", {
    method: "POST", credentials: "same-origin", headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  const result: AccountResult | null = await response.json().catch(() => null);
  if (!response.ok || !result) {
    const messages: Record<string, string> = {
      "invalid-email-or-password": "Enter an email and a password of at least 12 characters.",
      "invalid-product-credentials": "That email and password did not match an ElectroCAD account.",
      "invalid-or-expired-email-code": "The code is incorrect or expired.",
      "email-code-request-required": "Request a fresh code in this tab.",
      "product-account-not-authorized": "Could not complete this request. If you already registered, sign in or reset your password.",
      "wait-and-retry": "Wait before requesting another code.",
    };
    throw new Error(messages[result?.error ?? ""] ?? "ElectroCAD account service is unavailable.");
  }
  return result;
}

export async function verifiedUser() {
  const client = supabaseClient();
  const {data, error} = await client.auth.getUser();
  if (error || !data.user?.email_confirmed_at || data.user.is_anonymous) return null;
  const result = await client.schema("public").rpc("adigunelectrocad_has_verified_product_session");
  return result.error || result.data !== true ? null : data.user;
}
