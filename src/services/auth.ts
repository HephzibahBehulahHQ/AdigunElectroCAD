import type { User } from "@supabase/supabase-js";
import { runtimeConfig, supabaseClient } from "./supabase";

const existingEmail = (message: string) => /already (?:registered|exists)|email.*(?:taken|registered)/i.test(message);

export const isAnonymousUser = (user: User | null | undefined) => Boolean(user && "is_anonymous" in user && user.is_anonymous);

export async function startAnonymousPreview() {
  const { data, error } = await supabaseClient().auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabaseClient().auth.signUp({ email, password, options: { emailRedirectTo: runtimeConfig().authRedirectUrl } });
  if (error) throw error;
  return data.user;
}

export async function beginAnonymousUpgrade(email: string) {
  const { error } = await supabaseClient().auth.updateUser({ email });
  if (error) return { sent: false, existingEmail: existingEmail(error.message), message: error.message };
  return { sent: true, existingEmail: false, message: "Confirmation email sent. Open it, return to this session, then set a password." };
}

export async function finishAnonymousUpgrade(password: string) {
  const { data: current, error: userError } = await supabaseClient().auth.getUser();
  if (userError) throw userError;
  if (!current.user?.email_confirmed_at || isAnonymousUser(current.user)) {
    throw new Error("Confirm your email before setting a password.");
  }
  const { data, error } = await supabaseClient().auth.updateUser({ password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const { error } = await supabaseClient().auth.signOut();
  if (error) throw error;
}
